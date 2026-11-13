# Downloads

The product page lists the files in `releases.json` and links to them here,
at `/downloads/<file>`. To publish a release:

1. Copy the APK, the Windows zip and the Linux .deb into this folder
   (they are git-ignored, so they never land in the repo).
2. Update `releases.json`: the version, the date, each `file` name and
   `size`.
3. Deploy. The page picks the new list up on the next visit.

A file listed in `releases.json` but missing from the server shows as
"Coming soon" instead of a broken link.
