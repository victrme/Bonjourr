import { onSettingsLoad } from '../utils/onsettingsload.ts'

interface NetworkFormReturn {
    load: () => void
    reset: () => void
    warn: (err: unknown) => void
    success: (messageText: string) => void
    accept: (inputId?: string, value?: string) => void
}

export function networkForm(targetId: string): NetworkFormReturn {
    let form: HTMLFormElement
    let button: HTMLButtonElement
    let message: HTMLSpanElement
    let loadTimeout = 0

    onSettingsLoad((): void => {
        form = document.getElementById(targetId) as HTMLFormElement
        button = form?.querySelector('button:last-of-type') as HTMLButtonElement
        message = form?.querySelector('small') as HTMLSpanElement

        for (const input of form.querySelectorAll('input')) {
            input?.addEventListener('input', () => {
                const placeholder = input.getAttribute('placeholder')
                const isSame = placeholder === input.value
                const isEmpty = input.value === ''
                const isValid = form.checkValidity()

                form.classList.toggle('valid', isValid)
                form.classList.toggle('remove', isValid && (isSame || isEmpty))
            })
        }

        form?.addEventListener('input', () => {
            if (form.classList.contains('warn') || form.classList.contains('success')) {
                form.classList.remove('warn', 'success')
                button.removeAttribute('disabled')
            }
        })
    })

    function reset(): void {
        form.classList.remove('load', 'warn', 'success', 'valid', 'remove')
        button.removeAttribute('disabled')
        clearTimeout(loadTimeout)
    }

    function load(): void {
        loadTimeout = setTimeout(() => {
            form.classList.remove('warn')
            form.classList.add('valid', 'load')
            button.setAttribute('disabled', 'disabled')
        }, 50)
    }

    function warn(err: unknown): void {
        form.classList.add('warn')
        form.classList.remove('load')
        button.setAttribute('disabled', '')
        message.textContent = err as string
        clearTimeout(loadTimeout)
    }

    function success(messageText: string): void {
        form.classList.add('success')
        form.classList.remove('load', 'warn')
        button.setAttribute('disabled', '')
        message.textContent = messageText
        clearTimeout(loadTimeout)
    }

    function accept(inputId?: string, value?: string): void {
        if (inputId && form.checkValidity()) {
            form.classList.remove('valid')

            const input = document.getElementById(inputId)

            if (input && value) {
                input.setAttribute('placeholder', value)
            }
        }

        clearTimeout(loadTimeout)
        setTimeout(() => reset(), 200)
    }

    return {
        load,
        warn,
        success,
        reset,
        accept,
    }
}
