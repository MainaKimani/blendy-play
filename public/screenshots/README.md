# Screenshots

The product page's gallery reads `screenshots-<version>.json`: for each
device (`phone`, `tv`, `desktop`) a list of images with a caption. To change
the gallery, drop new images here and edit the list. WebP keeps them small.

Every file here carries the app version it shows (`-172` for 1.7.2), the
list included. The CDN keeps a file under the same name for a long time, so
a new set gets new names rather than replacing the old files: rename them
all to the new version, and point `home.component.ts` (the list) and
`home.component.html` (`hero-app`) at the new names.

The current set shows Blendy Play's own screens (welcome, creating an
account with a referral code, the emailed-code check, the optional server
key step, plans with the daily pass, My Subscription, the reminder when a
plan ends soon, one-tap renew) and two views of the listing as the app shows
it (ads blocked, Blendy Play's logo). Each is captured at the device's size
(phone 390×844 at 1.35×, TV 1280×720 at 1.5×, desktop 1440×900 at 1.25×)
with the whole screen in view: the zoom is lowered where a screen wouldn't
fit, and the listing shots are framed on two complete rows.
