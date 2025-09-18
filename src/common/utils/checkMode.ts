export function isProd(): boolean {
    return process.env.APP_ENV === 'production';
}

export function isDev(): boolean {
    return !isProd();
}
