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
]

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

        const currentMonth = 1 // january for testing
        // const currentMonth = new Date().getMonth() + 1 // production one

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

            // inserts supporters modal dom
            supportersModal(true)

            supporters_notif.addEventListener("click", function (event) {
                if (event.target instanceof Element && !event.target.closest('#supporters-notif-close')) {
                    supportersModal(undefined, true)
                    populateModal()
                }
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
                document.addEventListener('keyup', (event) => {
                    if (event.key === 'Escape' && document.documentElement.hasAttribute('supporters_modal_open')) {
                        supportersModal(undefined, false)
                    }
                })
            })
        }
    }

    if (state !== undefined) {
        document.dispatchEvent(new Event('toggle-settings'))

        if (state) {
            document.documentElement.setAttribute('supporters_modal_open', '')
        } else {
            document.documentElement.removeAttribute('supporters_modal_open')
        }
    }
}

let modalPopulated = false
export async function populateModal() {
    if (modalPopulated) return

    // let response: Response | undefined
    // response = await fetch("https://bonjourr-kofi.pages.dev/list")
    // console.log(response)

    const json = [{ "date": "03/10/2024 22:49:00", "name": "Randy", "amount": 2, "monthly": true, "paidWith": "stripe", "hashedEmail": "LTE2NDA4MDM3MDg=" }, { "date": "14/10/2024 04:27:00", "name": "Ko-fi Supporter", "amount": 5, "monthly": false, "paidWith": "stripe", "hashedEmail": "LTIwNDQwODU3MTk=" }, { "date": "17/10/2024 15:41:00", "name": "Mark B", "amount": 10, "monthly": false, "paidWith": "stripe", "hashedEmail": "LTExNjI5MTg1MDY=" }, { "date": "19/10/2024 18:37:00", "name": "Levon", "amount": 5, "monthly": false, "paidWith": "stripe", "hashedEmail": "LTE4ODE0NTY2Njk=" }, { "date": "28/10/2024 09:56:00", "name": "Francis", "amount": 5, "monthly": true, "paidWith": "stripe", "hashedEmail": "MTQ0MTA3MjM2OA==" }, { "date": "03/11/2024 09:37:00", "name": "Marcel", "amount": 5, "monthly": false, "paidWith": "stripe", "hashedEmail": "MTc1NjE0MDc1" }, { "date": "03/11/2024 22:49:00", "name": "Randy", "amount": 2, "monthly": true, "paidWith": "stripe", "hashedEmail": "LTE2NDA4MDM3MDg=" }, { "date": "07/11/2024 16:47:00", "name": "Ros", "amount": 5, "monthly": false, "paidWith": "stripe", "hashedEmail": "NDEzMDUyOTI5" }, { "date": "28/11/2024 09:56:00", "name": "Francis", "amount": 5, "monthly": true, "paidWith": "stripe", "hashedEmail": "MTQ0MTA3MjM2OA==" }, { "date": "30/11/2024 00:22:00", "name": "SteveWhite", "amount": 5, "monthly": false, "paidWith": "stripe", "hashedEmail": "MTk1NjIwMTY2OA==" }]

    // sorts in descending order
    json.sort((a, b) => b.amount - a.amount)

    const monthlyFragment = document.createDocumentFragment()
    const onceFragment = document.createDocumentFragment()

    json.forEach((supporter: { name: string, monthly: boolean }) => {
        const li = document.createElement('li')
        li.innerHTML = supporter.name
        
        const targetFragment = supporter.monthly ? monthlyFragment : onceFragment
        targetFragment.appendChild(li)
    })

    document.querySelector('#supporters-modal #monthly')?.appendChild(monthlyFragment)
    document.querySelector('#supporters-modal #once')?.appendChild(onceFragment)

    modalPopulated = true
}