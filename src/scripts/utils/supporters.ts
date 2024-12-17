import { tradThis } from '../utils/translations'
import onSettingsLoad from './onsettingsload'
import storage from '../storage'

interface SupportersUpdate {
    wasClosed?: boolean,
    enabled?: boolean,
    storedMonth?: number
}

const monthNames = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
];

export function supportersNotifications(init?: Sync.Supporters, update?: SupportersUpdate) {
    if (update) {
        updateSupportersOption(update)
        return
    }

    //
    if (init) {
        if (!init?.enabled) return

        const wasClosed = init?.wasClosed
        const storedMonth = init?.storedMonth

        // extracts notification template from index.html
        const template = document.getElementById('supporters-notif-template') as HTMLTemplateElement
        const doc = document.importNode(template.content, true)
        const supporters_notif = doc.getElementById('supporters-notif')

        // const currentMonth = 1 // january for testing
        const currentMonth = new Date().getMonth() + 1 // production one

        // if it's a new month and notif was closed previously
        if (!supporters_notif || currentMonth === storedMonth && wasClosed) {
            return
        }

        const title = doc.getElementById('supporters-notif-title') as HTMLElement
        const close = doc.getElementById('supporters-notif-close') as HTMLElement
        const button = doc.getElementById('supporters-notif-button') as HTMLElement

        // resets closing and stores new month
        supportersNotifications(undefined, {
            wasClosed: false,
            storedMonth: currentMonth
        })

        supportersModal()

        document.documentElement.setAttribute('supporters_notif_visible', '');

        onSettingsLoad(() => {
            title.innerText = tradThis(
                `This ${monthNames[currentMonth - 1]}, Bonjourr is brought to you by our lovely supporters.`
            )
            
            button.innerText = tradThis('Find out who they are')

            document.querySelector('#settings-notifications')?.insertAdjacentElement('beforebegin', supporters_notif)

            // CSS needs the exact notification height for closing animation trick to work
            const mobileDragZone = document.querySelector('#mobile-drag-zone') as HTMLElement
            
            setVariableHeight(supporters_notif, mobileDragZone)
            window.onresize = () => setVariableHeight(supporters_notif, mobileDragZone)

            supportersModal(true)

            supporters_notif.addEventListener("click", function () {
                supportersModal(undefined, true)
            })
        })


        if (close) {
            // when clicking on close button
            close.addEventListener("click", function () {
                document.documentElement.removeAttribute('supporters_notif_visible');

                // updates data to not show notif again this month
                supportersNotifications(undefined, { wasClosed: true })

                // completely removes notif HTML after animation is done
                setTimeout(function () {
                    supporters_notif.remove()
                }, 200)
            })
        }
    }
    

    function getHeight(element: HTMLElement): number  {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)

        // Get the margins
        const marginTop = parseFloat(style.marginTop)
        const marginBottom = parseFloat(style.marginBottom)

        // Return the height including margins
        return rect.height + marginTop + marginBottom
    }

    function setVariableHeight(element: HTMLElement, mobileDragZone: HTMLElement) {
        let isMobileSettings = window.getComputedStyle(mobileDragZone).display === 'block' ? true : false
 
        document.documentElement.style.setProperty(
            "--supporters-notif-height",
            '-' + (getHeight(element) + (isMobileSettings ? 40 : 0)).toString() + 'px'
        )
    }
}

async function updateSupportersOption(update: SupportersUpdate) {
    const data = await storage.sync.get()
    const newSupporters: any = { ...data.supporters }

    if (update.enabled !== undefined) {
        newSupporters.enabled = update.enabled
    }
    
    if (update.wasClosed !== undefined) {
        newSupporters.wasClosed = update.wasClosed
    }
    
    if (update.storedMonth !== undefined) {
        newSupporters.storedMonth = update.storedMonth
    }

    storage.sync.set({
        supporters: newSupporters
    })
}









export function supportersModal(init?: boolean, state?: boolean) {
    if (init) {
        const template = document.getElementById('supporters-modal-template') as HTMLTemplateElement
        const doc = document.importNode(template.content, true)
        const supporters_modal = doc.getElementById('supporters-modal-container')

        if (supporters_modal) {
            onSettingsLoad(() => {
                const close = doc.getElementById('supporters-modal-close') as HTMLElement

                // inserts modal dom
                document.querySelector('#interface')?.insertAdjacentElement('beforebegin', supporters_modal)
                
                // close button event
                close.addEventListener("click", function () {
                    supportersModal(undefined, false)
                })

                // close when click on background
                supporters_modal.addEventListener("click", function (event) {
                    if ((event.target as HTMLElement)?.id === "supporters-modal-container") {
                        supportersModal(undefined, false)
                    }
                })

                // close when esc key
                document.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape') {
                        supportersModal(undefined, false)
                    }
                })
            })
        }
    }

    if (state !== undefined) {
        if (state) {
            document.documentElement.setAttribute('supporters_modal_open', '')
        } else {
            document.documentElement.removeAttribute('supporters_modal_open')
        }
    }
    

}