// I have no idea what I'm doing lol

import onSettingsLoad from './onsettingsload'

export function supportersNotifications(what: Record<string, boolean>): void {
    //
    onSettingsLoad(() => {
        let supportersNotif = document.body.querySelector('.supporters-notification')

        let close = supportersNotif?.querySelector('.close')

        if (close) {
            close.addEventListener("click", function() {
                console.log('e')
                supportersNotif?.classList.add('removed')
            })
        }

    })
}

