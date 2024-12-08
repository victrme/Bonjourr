// I have no idea what I'm doing lol

import onSettingsLoad from './onsettingsload'
import storage from '../storage'

export function supportersNotifications(supportersData?: { wasClosed?: number, storedMonth?: number }): void {
    //
    onSettingsLoad(() => {
        console.log(supportersData)

        const wasClosed = supportersData?.wasClosed
        const storedMonth = supportersData?.storedMonth

        // extracts notification template from settings.html
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
                    wasClosed: 0
                }
            })
        }


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
                        wasClosed: 1
                    }
                })
            })
        }
    })
}