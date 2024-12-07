<a id="v1.4.0"></a>
# [v1.4.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.4.0) - 2024-11-26

<!-- Release notes generated using configuration in .github/release.yml at v1.4.0 -->

## What's New
This release introduces important fixes and enhancements to improve the functionality and usability of the Vehicle Status Card.

### Fixes 🐛
- **Render Template Subscription for Non-Admin Users**: Fixed an issue where template subscriptions failed for non-admin users, ensuring compatibility for all user roles. [#32](https://github.com/ngocjohn/vehicle-status-card/pull/32)

### Enhancements ✨
- **YAML Code Editor**: Added a YAML code editor for single configuration edits, making customization easier and more user-friendly. [#35](https://github.com/ngocjohn/vehicle-status-card/pull/35)



**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.3.1...v1.4.0

[Changes][v1.4.0]


<a id="v1.3.1"></a>
# [v1.3.1](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.3.1) - 2024-10-29

<!-- Release notes generated using configuration in .github/release.yml at v1.3.1 -->

## What's Changed
### Fixes 🐛
* Fetching address from location by in [#29](https://github.com/ngocjohn/vehicle-status-card/pull/29)
issue with fetching the address from the location. The code was updated to correctly fetch the address from the location and display it in the map.


**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.3.0...v1.3.1

[Changes][v1.3.1]


<a id="v1.3.0"></a>
# [v1.3.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.3.0) - 2024-10-20

<!-- Release notes generated using configuration in .github/release.yml at v1.3.0 -->

### New Features 🎉
* **Create Card Using Editor UI** [#23](https://github.com/ngocjohn/vehicle-status-card/pull/23)

Now you can easily create and customize cards directly through the **Editor UI**, enhancing the user experience by providing a more intuitive interface for card configuration. This feature simplifies the process of card creation, making it accessible without requiring manual code changes.


* **Add Color Template for Button Icons** [#25](https://github.com/ngocjohn/vehicle-status-card/pull/25)

New **color template** feature for button icons, allowing for even more customization options. You can now define custom colors for button icons, improving the visual consistency and flexibility of your vehicle status cards.

**If you enjoy these new features, consider giving the repo a ⭐ to show your support! 🚀**


![2024-10-20 17 51 35](https://github.com/user-attachments/assets/927dc6aa-a61c-4c50-9683-f9b75500b207)

**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.2.0...v1.3.0

[Changes][v1.3.0]


<a id="v1.2.0"></a>
# [v1.2.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.2.0) - 2024-10-16

<!-- Release notes generated using configuration in .github/release.yml at v1.2.0 -->

### New Features 🎉
This update includes several exciting new features to enhance the user experience:


* **Drag & Drop Reordering**: Easily rearrange your buttons with drag-and-drop functionality. [#19](https://github.com/ngocjohn/vehicle-status-card/pull/19)
* **Haptic Feedback**: Added haptic feedback for a more interactive and tactile experience when pressing buttons. [#20](https://github.com/ngocjohn/vehicle-status-card/pull/20)
* **Copy Button Option**: Quickly duplicate existing buttons with the new copy button feature.  [#21](https://github.com/ngocjohn/vehicle-status-card/pull/21)
* **Color Template for Indicators**: Customize the appearance of indicators using color templates to match your dashboard style. [#22](https://github.com/ngocjohn/vehicle-status-card/pull/22)


![feat-copy-reorder](https://github.com/user-attachments/assets/f4fa3254-866f-41ed-b031-48d67f00d4f7)


**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.1.1...v1.2.0

[Changes][v1.2.0]


<a id="v1.1.1"></a>
# [v1.1.1](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.1.1) - 2024-09-30

<!-- Release notes generated using configuration in .github/release.yml at v1.1.1 -->

## What's Changed
### Fixes 🐛
* Fix: Properly Handle hass Updates in Custom Cards by [@ngocjohn](https://github.com/ngocjohn) in [#12](https://github.com/ngocjohn/vehicle-status-card/pull/12)


**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.1.0...v1.1.1

[Changes][v1.1.1]


<a id="v1.1.0"></a>
# [v1.1.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.1.0) - 2024-09-24

<!-- Release notes generated using configuration in .github/release.yml at v1.1.0 -->

## What's Changed
This update introduces two major features:

1. **Tire Pressures Card**: A new customizable card that allows users to monitor and display their vehicle’s tire pressures with real-time data. You can upload a custom car image, assign entities to each tire, and adjust the size, position, and layout of the card for a personalized experience.
  
2. **Image Slides with Swiper Config**: Added advanced options for configuring image slides, including autoplay, loop, delay, speed, and transition effects (`slide`, `fade`, `coverflow`). Users can now create a more dynamic and visually engaging slideshow.

If you enjoy these new features, consider giving the repo a ⭐ to show your support! 🚀 


  ![tire-card-v110](https://github.com/user-attachments/assets/96cf9106-8a2b-4ce0-926b-bc510a67847e)


### New Features 🎉
* Feat: Add tap actions to  buttons grid by [@ngocjohn](https://github.com/ngocjohn) in [#2](https://github.com/ngocjohn/vehicle-status-card/pull/2)
* Feat: Add Tire Pressure card type by [@ngocjohn](https://github.com/ngocjohn) in [#6](https://github.com/ngocjohn/vehicle-status-card/pull/6)
* Feat: Add visibility template for single indicators by [@ngocjohn](https://github.com/ngocjohn) in [#9](https://github.com/ngocjohn/vehicle-status-card/pull/9)
* Feat: Add Swiper configuration for slideshow by [@ngocjohn](https://github.com/ngocjohn) in [#10](https://github.com/ngocjohn/vehicle-status-card/pull/10)
### Fixes 🐛
* Fix:  image URL input and add new URL functionality by [@ngocjohn](https://github.com/ngocjohn) in [#8](https://github.com/ngocjohn/vehicle-status-card/pull/8)

## New Contributors
* [@ngocjohn](https://github.com/ngocjohn) made their first contribution in [#2](https://github.com/ngocjohn/vehicle-status-card/pull/2)

**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.0.0...v1.1.0

[Changes][v1.1.0]


<a id="v1.0.0"></a>
# [v1.0.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.0.0) - 2024-09-18

# Initial release 

v1.0.0

**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/commits/v1.0.0

[Changes][v1.0.0]


[v1.4.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.3.1...v1.4.0
[v1.3.1]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.3.0...v1.3.1
[v1.3.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.2.0...v1.3.0
[v1.2.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.1.1...v1.2.0
[v1.1.1]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.1.0...v1.1.1
[v1.1.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.0.0...v1.1.0
[v1.0.0]: https://github.com/ngocjohn/vehicle-status-card/tree/v1.0.0

<!-- Generated by https://github.com/rhysd/changelog-from-release v3.8.1 -->
