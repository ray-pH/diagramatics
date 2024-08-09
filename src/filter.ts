

export module string_filter  {
    export function outer_shadow(
        dx: number, dy: number, radius: number, stdev: number, color: string, 
        id: string='outer-shadow',
        width: number, height: number,
        scale_factor: number=1
    ){
        const x = (width - 1) / 2;
        const y = (height - 1)/2;
        return `
        <filter id="${id}" x="-${x * 100}%" y="-${y * 100}%" width="${width * 100}%" height="${height * 100}%">
            <feMorphology operator="dilate" radius="${radius * scale_factor}" in="SourceAlpha" result="dilated" />
            <feGaussianBlur in="dilated" stdDeviation="${stdev * scale_factor}" />
            <feOffset dx="${dx * scale_factor}" dy="${dy * scale_factor}" result="offsetblur" />
            <feFlood flood-color="${color}" result="colorblur"/>
            <feComposite in="colorblur" in2="offsetblur" operator="in" result="shadow" />
            <feComposite in="shadow" in2="SourceAlpha" operator="out" result="clipped-shadow"/>
        </filter>
        `
    }
}
