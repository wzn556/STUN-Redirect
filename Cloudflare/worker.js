export default {
    async fetch(request, env, ctx) {

        try {
            const KV = await env.KV.get('CONFIG');
            console.log("Get KV: " + KV);
            const url = new URL(request.url);
            const pathParts = url.pathname.split('/').filter(Boolean);

            const clientIP = getClientIP(request);

            if (url.pathname === '/ip') {
                return htmlResponse(`<html><body>Your IP: ${clientIP}</body></html>`);
            }

            const config = await loadConfiguration(KV);

            if (pathParts[0] === "port") {
                return await handlePortRoute(pathParts, config, env);
            }

            if (pathParts[0] === "host") {
                return await handleHostRoute(pathParts, config, env);
            }

            if (pathParts.length >= 2) {
                return await handleRedirection(pathParts, url, clientIP, config, request);
            }

            return new Response('404 Not Found', { status: 404 });

        } catch (err) {
            return new Response(`Server Error: ${err.message}`, { status: 500 });
        }
    }
}

function getClientIP(request) {
    const headers = request.headers;
    return headers.get('EO-Client-IP')?.trim() ||
        headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        headers.get('x-real-ip')?.trim() ||
        headers.get('cf-connecting-ip')?.trim() ||
        'unknown';
}

async function loadConfiguration(KV) {
    const config = await JSON.parse(KV) || {};
    return {
        ipv4: config.ipv4 || {},
        ipv6: config.ipv6 || {},
        host: config.host || {}
    };
}

async function handlePortRoute(parts, config, env) {
    if (parts.length < 2 || parts.length > 4)
        return new Response('Invalid Path', { status: 400 });

    const portName = parts[1];

    if (parts.length === 2) {
        return htmlResponse(`
            ${portName} ipv4 Port: ${config.ipv4[portName] || 'N/A'}<br>
            ${portName} ipv6 Port: ${config.ipv6[portName] || 'N/A'}
        `);
    }

    if (parts.length === 3) {
        const portType = parts[2];
        if (!["ipv4", "ipv6"].includes(portType))
            return new Response('Invalid Port Type', { status: 400 });

        return htmlResponse(
            `${portName} ${portType} Port: ${config[portType][portName] || 'N/A'}`
        );
    }

    if (parts.length === 4) {
        const portType = parts[2];
        const rawPort = parts[3];
        const portValue = parseInt(rawPort);

        if (!["ipv4", "ipv6"].includes(portType))
            return new Response('Invalid Port Type', { status: 400 });
        if (!isValidPort(portValue))
            return new Response('Invalid Port Value', { status: 400 });

        config[portType][portName] = portValue;
        await env.KV.put('CONFIG', JSON.stringify(config));
        return htmlResponse(`Updated ${portName} ${portType}: ${portValue} success`);
    }
}

async function handleHostRoute(parts, config, env) {
    if (parts.length !== 2 && parts.length !== 3)
        return new Response('Invalid Path', { status: 400 });

    const hostName = parts[1];

    if (parts.length === 2) {
        return htmlResponse(`${hostName} Host: ${config.host[hostName] || 'N/A'}`);
    }

    if (parts.length === 3) {
        const newHost = parts[2];

        if (!isValidHost(newHost))
            return new Response('Invalid Host Value', { status: 400 });

        config.host[hostName] = newHost;
        await env.KV.put('CONFIG', JSON.stringify(config));
        return htmlResponse(`Updated ${hostName} host: ${newHost} success`);
    }
}

async function handleRedirection(parts, url, clientIP, config, request) {
    const [subdomain, service, ...remaining] = parts;
    const isIPv4 = ip => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip); // 简化正则

    const port = isIPv4(clientIP)
        ? config.ipv4?.[subdomain] ?? config.ipv6?.[subdomain]
        : config.ipv6?.[subdomain] ?? config.ipv4?.[subdomain];

    if (!isValidPort(port))
        return new Response('No Valid Port', { status: 400 });

    const pathSuffix = remaining.length ? `/${remaining.join('/')}` : '';
    const queryString = url.search ? `?${url.searchParams.toString()}` : '';

    const targetHost = config.host[subdomain];
    if (!targetHost)
        return new Response('Host not configured', { status: 400 });

    const auth = getBasicAuth(request);
    const protocol = url.protocol.includes('https') ? 'https' : 'http';

    const targetUrl = `${protocol}://${auth}${service}.${subdomain}.${targetHost}:${port}${pathSuffix}${queryString}`;

    return new Response(null, {
        status: 307,
        headers: {
            'Location': targetUrl,
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
        }
    });
}

function htmlResponse(content) {
    return new Response(`<html><body>${content}</body></html>`, {
        headers: { 'Content-Type': 'text/html' }
    });
}

function getBasicAuth(request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Basic ')) {
        return `${authHeader.slice(6)}@`;
    }
    return '';
}

function isValidPort(port) {
    return Number.isInteger(port) && port >= 0 && port <= 65535;
}

function isValidHost(host) {
    return /^[\w.-]{1,255}$/.test(host);
}
