export const specialistsHref = import.meta.env.BASE_URL + 'specialists/'
export const specialistHref = (image: string) => specialistsHref + image.replace('.webp', '.html')
