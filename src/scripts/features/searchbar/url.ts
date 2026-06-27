const topLevelDomains =
    'com,org,de,br,ru,uk,net,jp,it,fr,nl,pl,in,au,ca,cz,es,ch,be,co,eu,ua,ar,hu,at,ro,gr,tr,se,za,kr,mx,vn,id,info,cl,dk,ir,fi,nz,shop,sk,io,tw,il,online,no,pt,ai,рф,store,ie,cn,by,app,site,pro,xyz,lt,rs,us,my,me,pk,hr,kz,si,bg,biz,sg,ee,pe,ae,cc,top,world,lv,th,club,hk,live,tv,ng,ph,vip,ma,dev,sa,cat,uy,tech,blog,ke,ovh'
        .split(',')

export function safeURL(s: string): URL | undefined {
    try {
        const url = new URL(s)
        const hasSpaces = url.hostname.includes('%20')

        if (hasSpaces) {
            throw 'URL contructor allows spaces, not me'
        }

        return url
    } catch (_) { //
    }
}

export function startAsHttpUrl(string: string): boolean {
    return 'https://'.startsWith(string) ||
        'localhost'.startsWith(string) ||
        '192.168.'.startsWith(string) ||
        'http://'.startsWith(string) ||
        '::1'.startsWith(string)
}

export function isLocalIp({ hostname }: URL): boolean {
    return hostname.includes('192.168.') ||
        hostname.startsWith('127.0.0.1') ||
        hostname.startsWith('localhost')
}

export function isDistantUrl({ host }: URL): boolean {
    const tld = host.split('.').at(-1) ?? ''
    return topLevelDomains.includes(tld)
}
