const VERSION = '22.0.1'

buildPlatforms()
archiveSource()

for await (const entry of Deno.readDir('./release')) {
    if (entry.isDirectory) {
        archivePlatform(entry.name)
    }
}

/*
 * Functions
 */

function buildPlatforms(): void {
    console.log('Build platforms')

    new Deno.Command('deno', { args: ['task', 'build'] }).outputSync()
}

function archiveSource(): void {
    const files = ['_locales', 'docker', 'src', 'tasks', 'deno.json', 'deno.lock', 'README.md']
    const outfile = `./release/firefox/bonjourr-source-${VERSION}.zip`
    const args = ['-r', outfile, ...files]

    console.log('Archiving source')

    new Deno.Command('zip', { args }).outputSync()
}

function archivePlatform(name: string): void {
    const args = ['-r', `bonjourr-${name}-${VERSION}.zip`, '.']
    const cwd = `./release/${name}`

    console.log(`Archiving ${name}`)

    new Deno.Command('zip', { args, cwd }).outputSync()
}
