const version = '22.0.1'

async function run(cmd: string, args: string[], cwd?: string): Promise<void> {
    const { success } = await new Deno.Command(cmd, { args, cwd }).output()
    if (!success) throw new Error(`Command failed: ${cmd} ${args.join(' ')}`)
}

await run('deno', ['task', 'build'])

for await (const entry of Deno.readDir('./release')) {
    if (!entry.isDirectory) continue

    const name = entry.name
    const archive = `bonjourr-${name}-${version}.zip`

    console.log(`Archiving ${name}...`)

    await run('zip', ['-r', archive, '.'], `./release/${name}`)
}

console.log('Archiving source...')

await run('zip', [
    '-r',
    `./release/firefox/bonjourr-source-${version}.zip`,
    '_locales',
    'docker',
    'src',
    'tasks',
    'deno.json',
    'deno.lock',
    'README.md',
])
