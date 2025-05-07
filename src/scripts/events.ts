let isMousingDownOnInput = false

export function userActions() {
	document.body.addEventListener('mousedown', detectTargetAsInputs)
	document.getElementById('b_editmove')?.addEventListener('click', closeSettingsOnMoveOpen)

	document.addEventListener('click', clickUserActions)
	document.addEventListener('keydown', keyboardUserActions)
	document.addEventListener('keyup', keyboardUserActions)
}

// Main functions

function keyboardUserActions(event: KeyboardEvent) {
	const domsuggestions = document.getElementById('sb-suggestions')

	if (event.code === 'Escape') {
		if (domsuggestions?.classList.contains('shown')) {
			domsuggestions?.classList.remove('shown')
			return
		}

		const open = isOpen()
		const keyup = event.type === 'keyup'

		if (open.contextmenu) {
			document.dispatchEvent(new Event('close-edit'))
		} //
		else if (open.settings && keyup) {
			document.dispatchEvent(new Event('toggle-settings'))
		} //
		else if (open.selectall) {
			document.dispatchEvent(new Event('remove-select-all'))
		} //
		else if (open.folder) {
			document.dispatchEvent(new Event('close-folder'))
		} //
		else if (keyup) {
			// condition to avoid conflicts with esc key on supporters modal
			// likely to be improved
			if (document.documentElement.dataset.supportersModal === undefined) {
				document.dispatchEvent(new Event('toggle-settings'))
			}
		}

		return
	}

	if (event.code === 'Tab') {
		document.body.classList.toggle('tabbing', true)
		return
	}
}

function clickUserActions(event: MouseEvent) {
	if (isMousingDownOnInput) {
		return
	}

	const open = isOpen()
	const composedPath = (event.composedPath() as Element[]) ?? [document.body]
	const path = composedPath.filter((node) => node?.className?.includes)
	const pathIds = path.map((el) => (el as HTMLElement).id)

	const on = {
		body: (path[0] as HTMLElement).tagName === 'BODY',
		link: path.some((el) => el.classList.contains('link')),
		linkfolder: path.some((el) => el.className.includes('folder')),
		addgroup: path.some((el) => el.className.includes('add-group')),
		folder: path.some((el) => el.className.includes('in-folder')),
		localfiles: path.some((el) => el.id === 'local_options'),
		interface: pathIds.includes('interface'),
		editlink: pathIds.includes('editlink'),
		settings: path.some((el) => el.id === 'settings'),
		showsettings: path.some((el) => el.id === 'show-settings'),
	}

	if (document.body.classList.contains('tabbing')) {
		document.body?.classList.toggle('tabbing', false)
	}

	if (document.querySelectorAll('.thumbnail.selected') && !on.localfiles) {
		for (const node of document.querySelectorAll('.thumbnail.selected')) {
			node.classList.remove('selected')
		}
	}

	if (on.showsettings) {
		document.dispatchEvent(new Event('toggle-settings'))
	}

	if (open.contextmenu && !on.editlink) {
		if (on.addgroup && document.querySelector('.link-title.add-group.selected')) {
			return
		}

		document.dispatchEvent(new Event('close-edit'))
		return
	}

	if ((on.body || on.interface) === false) {
		return
	}

	if (open.settings) {
		document.dispatchEvent(new Event('toggle-settings'))
	} //
	else if (open.selectall && !on.link) {
		document.dispatchEvent(new Event('remove-select-all'))
	} //
	else if (open.folder && !on.folder && !on.linkfolder) {
		document.dispatchEvent(new Event('close-folder'))
	}
}

// Handlers

function isOpen() {
	return {
		settings: !!document.getElementById('settings')?.classList.contains('shown'),
		folder: !!document.querySelector('.in-folder'),
		selectall: document.getElementById('linkblocks')?.classList.contains('select-all'),
		contextmenu: document.querySelector<HTMLDialogElement>('#editlink')?.open,
	}
}

function detectTargetAsInputs(event: Event) {
	const path = event.composedPath() as Element[]
	const tagName = path[0]?.tagName ?? ''
	isMousingDownOnInput = ['TEXTAREA', 'INPUT'].includes(tagName)
}

function closeSettingsOnMoveOpen() {
	setTimeout(() => {
		const elementmover = document.getElementById('element-mover')
		const moverHasOpened = elementmover?.classList.contains('hidden') === false

		if (moverHasOpened) {
			document.dispatchEvent(new Event('toggle-settings'))
		}
	}, 20)
}
