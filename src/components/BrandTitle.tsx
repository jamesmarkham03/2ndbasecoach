// The product name lives here and in index.html (<title> and the iPad home-screen name),
// so a future rename only touches those two places.
export const APP_NAME = '2ndBaseCoach'
export const APP_TAGLINE = 'Every team has a 1st and 3rd base coach. This is the one in between.'

/** "2ndBase" in white, "Coach" in brand orange. */
export function BrandTitle() {
  return (
    <h1 className="brand-title" aria-label={APP_NAME}>
      2ndBase<span>Coach</span>
    </h1>
  )
}
