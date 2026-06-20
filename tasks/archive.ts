const VERSION = '22.3.0'

buildPlatforms()
archiveSource()
archivePlatform('chrome')
archivePlatform('edge')
archivePlatform('firefox')
archivePlatform('online')

/*
 * Functions
 */

function buildPlatforms(): void {
    new Deno.Command('deno', { args: ['task', 'build'] }).outputSync()
}

function archiveSource(): void {
    const files = ['_locales', 'docker', 'src', 'tasks', 'deno.json', 'deno.lock', 'README.md']
    const outfile = `./release/bonjourr-source-${VERSION}.zip`
    const args = ['-r', outfile, ...files, '-x', '*.DS_Store']

    console.log('Archiving source')

    new Deno.Command('zip', { args }).outputSync()
}

function archivePlatform(name: string): void {
    const args = ['-r', `../bonjourr-${name}-${VERSION}.zip`, '.', '-x', '*.DS_Store']
    const cwd = `./release/${name}`

    console.log(`Archiving ${name}`)

    new Deno.Command('zip', { args, cwd }).outputSync()
}
