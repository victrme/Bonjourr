import { getLang, tradThis } from '../utils/translations'
import onSettingsLoad from './onsettingsload'
import storage from '../storage'

const monthNames = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
];

export function supportersNotifications(supportersData?: { wasClosed?: boolean, storedMonth?: number }): void {
    //
    onSettingsLoad(() => {
        const wasClosed = supportersData?.wasClosed
        const storedMonth = supportersData?.storedMonth

        // extracts notification template from index.html
        const template = document.getElementById('supporters-notif-template') as HTMLTemplateElement
        const doc = document.importNode(template.content, true)
        const supporters_notif = doc.getElementById('supporters-notif')
        const title = doc.getElementById('supporters-notif-title') as HTMLElement
        const close = doc.getElementById('supporters-notif-close') as HTMLElement
        const button = doc.getElementById('supporters-notif-button') as HTMLElement

        // const currentMonth = 1 // january for testing
        const currentMonth = new Date().getMonth() + 1 // production one

        // if it's a new month and notif was closed in previous month
        // proceeds to enable it for new month 
        if (!supporters_notif || currentMonth === storedMonth && wasClosed) {
            // console.log('not a new month')
            return
        }

        if (wasClosed) {
            // console.log("c'était fermé")

            storage.sync.set({
                supporters: {
                    ...supportersData,
                    storedMonth: currentMonth,
                    wasClosed: false
                }
            })
        }

        const titleText = tradThis(`This ${monthNames[currentMonth - 1]}, Bonjourr is brought to you by our lovely supporters.`)

        title.innerText = titleText

        // wanted to get the first .settings-title as a reference element instead
        // but it's not getting the right one for some reason
        document.querySelector('#settings-notifications')?.insertAdjacentElement('beforebegin', supporters_notif)

        if (close) {
            close.addEventListener("click", function() {
                supporters_notif?.classList.add('removed')

                // updates data to not show notif again this month
                storage.sync.set({
                    supporters: {
                        ...supportersData,
                        wasClosed: true
                    }
                })
            })
        }
    })
}