<<<<<<< HEAD
## [1.18.1](https://github.com/ngocjohn/vehicle-status-card/compare/v1.18.0...v1.18.1) (2025-10-22)

### Bug Fixes

* **charge-target:**  replace `ha-tooltip` with pseudo element for tooltip ([#214](https://github.com/ngocjohn/vehicle-status-card/issues/214)) ([0909258](https://github.com/ngocjohn/vehicle-status-card/commit/0909258ab61f390f5a134e7f884bec526e81c632))
=======
## [1.18.1-dev.2](https://github.com/ngocjohn/vehicle-status-card/compare/v1.18.1-dev.1...v1.18.1-dev.2) (2025-11-18)

### Bug Fixes

* improve handling of the `state_template` for indicator subgroup items by normalizing the state content based on the `include_state_template` configuration. ([#221](https://github.com/ngocjohn/vehicle-status-card/issues/221)) ([8179a8a](https://github.com/ngocjohn/vehicle-status-card/commit/8179a8a6a6f3cc4a4d39e59c36b61e732249bd3a))
>>>>>>> 3468e9d (chore(release): 1.18.1-dev.2 [skip ci])

## [1.18.1-dev.1](https://github.com/ngocjohn/vehicle-status-card/compare/v1.18.0...v1.18.1-dev.1) (2025-10-20)

### Bug Fixes

* **charge-target:**  replace `ha-tooltip` with pseudo element for tooltip ([#214](https://github.com/ngocjohn/vehicle-status-card/issues/214)) ([dfaaa61](https://github.com/ngocjohn/vehicle-status-card/commit/dfaaa615356b0680af53255cbb8532fc183994e3))

## [1.18.0](https://github.com/ngocjohn/vehicle-status-card/compare/v1.17.0...v1.18.0) (2025-10-20)

### Features

* **images:** enhance image slider with multiple file upload support ([#209](https://github.com/ngocjohn/vehicle-status-card/issues/209)) ([eee496b](https://github.com/ngocjohn/vehicle-status-card/commit/eee496b69200da42f8891077e2cb8bc10c529a5a))

### Bug Fixes

* **button:** Update button grid legacy checks and update migration logic ([#213](https://github.com/ngocjohn/vehicle-status-card/issues/213)) ([93be63d](https://github.com/ngocjohn/vehicle-status-card/commit/93be63d6517d38eeb2f450aff6739bc56ce0f6f4))
* ensure swiper usage defaults to false and remove debug logs in color utility ([a67f2ae](https://github.com/ngocjohn/vehicle-status-card/commit/a67f2ae46d1cc217d80dadd56f75630869ddb017))
* icon action handler method ([#207](https://github.com/ngocjohn/vehicle-status-card/issues/207)) ([76e2e09](https://github.com/ngocjohn/vehicle-status-card/commit/76e2e0965401cfac608b14e2cd35322f26dcb684))
* Import of leaflet-providers ([#205](https://github.com/ngocjohn/vehicle-status-card/issues/205)) ([963a62d](https://github.com/ngocjohn/vehicle-status-card/commit/963a62da0a2288a9cd446b5b0c98967f2d2817a7))

<a id="v1.15.2"></a>
# [v1.15.2](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.15.2) - 2025-07-16

<!-- Release notes generated using configuration in .github/release.yml at v1.15.2 -->

## What's Changed
### 🐛 Fixes 
* Implement load and clean duplicatied resources for extra map component [@ngocjohn](https://github.com/ngocjohn) ([#167](https://github.com/ngocjohn/vehicle-status-card/issues/167))
## 🧰 Maintenance
* Update dependencies and improve development scripts [@ngocjohn](https://github.com/ngocjohn) ([#162](https://github.com/ngocjohn/vehicle-status-card/issues/162))


**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.15.1...v1.15.2

[Changes][v1.15.2]


<a id="v1.15.1"></a>
# [v1.15.1](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.15.1) - 2025-07-05


## What's Changed
This update introduces improved support for range calculations and enhances MapTiler popups with multi-entity support, making the Vehicle Status Card more flexible and informative.
### 🚀 New Features
- **Enhanced MapTiler popups**: Now supports displaying multiple entities in a single popup. [#159](https://github.com/ngocjohn/vehicle-status-card/pull/159)
  
![map-popup](https://github.com/user-attachments/assets/bf2f2495-80ae-4670-8bd3-5d9611aeef7f)

- **`max_value` support for range items**: Added `max_value` configuration for range-based items, improving precision in value calculations. [#153](https://github.com/ngocjohn/vehicle-status-card/pull/153)

**Full Changelog**: [v1.15.0...v1.15.1](https://github.com/ngocjohn/vehicle-status-card/compare/v1.15.0...v1.15.1)

[Changes][v1.15.1]


<a id="v1.14.0"></a>
# [v1.14.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.14.0) - 2025-06-18

<!-- Release notes generated using configuration in .github/release.yml at v1.14.0 -->

## What's Changed
### New Features 🎉
- **Add configurable color thresholds and visual styles to range info bars**  
  This update introduces support for custom color thresholds that dynamically change the progress bar's appearance. You can now choose between smooth gradients or segmented color blocks to represent energy levels visually.  [#149](https://github.com/ngocjohn/vehicle-status-card/pull/149) [#151](https://github.com/ngocjohn/vehicle-status-card/pull/151)
![colorthresholds](https://github.com/user-attachments/assets/48a03327-b0f0-4311-a4fa-304d73665654)

### Other Changes
- **Update README with new feature examples and assets**  
  Documentation now includes usage examples and screenshots of the new color features.  [#147](https://github.com/ngocjohn/vehicle-status-card/pull/147)


 **Full Changelog**: [v1.13.1...v1.14.0](https://github.com/ngocjohn/vehicle-status-card/compare/v1.13.1...v1.14.0)

[Changes][v1.14.0]


<a id="v1.13.1"></a>
# [v1.13.1](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.13.1) - 2025-06-09

<!-- Release notes generated using configuration in .github/release.yml at v1.13.1 -->

## What's Changed
### Fixes 🐛
* Set max-width to 100% for range energy level display by [@ngocjohn](https://github.com/ngocjohn) in [#146](https://github.com/ngocjohn/vehicle-status-card/pull/146)


**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.13.0...v1.13.1

[Changes][v1.13.1]


<a id="v1.13.0"></a>
# [v1.13.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.13.0) - 2025-06-09

<!-- Release notes generated using configuration in .github/release.yml at v1.13.0 -->

## What's Changed
This release adds new layout and configuration features for range info and buttons, along with important display fixes and improvements for optional config handling.

### New Features 🎉
* **Charging Template & Target Support**
Add charging template and charge target support in the range info progress bar. [#133](https://github.com/ngocjohn/vehicle-status-card/pull/133)
* **Range Info Layout Options**
Add layout configuration for range info bars.[#140](https://github.com/ngocjohn/vehicle-status-card/pull/140)  
![2025-06-09 22 13 27](https://github.com/user-attachments/assets/665c8577-9da0-4790-a4de-b5a8271e4881)

* **Transparent Button Background & State Colors**
Support transparent background and state-specific color styling for buttons. Enhances visual customization for dynamic or themed designs. [#142](https://github.com/ngocjohn/vehicle-status-card/pull/142)
![2025-06-09 21 56 29](https://github.com/user-attachments/assets/3f13e867-3b62-4903-a821-3092eb25ec29)

### Fixes 🐛
* Fix: Adjust energy item display to include charging icon inside [#139](https://github.com/ngocjohn/vehicle-status-card/pull/139)
* Update tireConfig handling to support optional properties [#143](https://github.com/ngocjohn/vehicle-status-card/pull/143)


**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.12.1...v1.13.0

[Changes][v1.13.0]


<a id="v1.12.1"></a>
# [v1.12.1](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.12.1) - 2025-06-04

<!-- Release notes generated using configuration in .github/release.yml at v1.12.1 -->

## What's Changed

### 🛠 Fixes
- **Indicator Config Bug**: Fixed a bug where indicators could be `undefined` if the configuration was missing or incomplete.  
  [#131](https://github.com/ngocjohn/vehicle-status-card/pull/131)

### ✨ Improvements
- **MiniMapBox Refactor**:  Integrated `ResizeObserver` to auto-adjust map size when the container resizes [#132](https://github.com/ngocjohn/vehicle-status-card/pull/132)


**Full Changelog**: [v1.12.0...v1.12.1](https://github.com/ngocjohn/vehicle-status-card/compare/v1.12.0...v1.12.1)

[Changes][v1.12.1]


<a id="v1.12.0"></a>
# [v1.12.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.12.0) - 2025-06-02

<!-- Release notes generated using configuration in .github/release.yml at v1.12.0 -->

## What's Changed

This release introduces several highly requested features, UI enhancements, and internal improvements for a better user experience and customization flexibility.

## ✨ New Features
- **Vertical Button Layout**  
  Easily switch the button grid layout to vertical orientation for compact UIs.  [#125](https://github.com/ngocjohn/vehicle-status-card/pull/125) 
![vsc-vertical-layout](https://github.com/user-attachments/assets/a1971290-afed-4dfe-9586-b7007818d60c)

- **Customizable Notification Badges**  
  Buttons now support customizable notification badge styles, letting you highlight states more effectively. [#126](https://github.com/ngocjohn/vehicle-status-card/pull/126)

- **Color Template for Indicator Groups Item**  
  Indicator group items can now use color templates for enhanced visual clarity.  [#127](https://github.com/ngocjohn/vehicle-status-card/pull/127)

- **Tap Action for Range Info Entities**  
  You can now define a tap action on range info entities for better interactivity.

## 🛠 Other Improvements
- Map Marker now updates automatically when entity location changes.
- Refactored action handler events and polished UI components for better responsiveness.  [#128](https://github.com/ngocjohn/vehicle-status-card/pull/128)

---

**🔗 Full Changelog**: [v1.11.3...v1.12.0](https://github.com/ngocjohn/vehicle-status-card/compare/v1.11.3...v1.12.0)

[Changes][v1.12.0]


<a id="v1.11.3"></a>
# [v1.11.3](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.11.3) - 2025-05-26

<!-- Release notes generated using configuration in .github/release.yml at v1.11.3 -->

## What's Changed
### Fixes 🐛
* Add tire schema and update related components for tire configuration [#117](https://github.com/ngocjohn/vehicle-status-card/pull/117)
* Add base button and default card panel components [#118](https://github.com/ngocjohn/vehicle-status-card/pull/118)
### Other Changes
* Update config schema with HA forms [#119]( https://github.com/ngocjohn/vehicle-status-card/pull/119)


**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.11.2...v1.11.3

[Changes][v1.11.3]


<a id="v1.11.2"></a>
# [v1.11.2](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.11.2) - 2025-05-21

<!-- Release notes generated using configuration in .github/release.yml at v1.11.2 -->

## What's Changed
### Fixes 🐛
* Fix the indicator entity picker to ensure proper functionality. [#110 ](https://github.com/ngocjohn/vehicle-status-card/pull/110)
### Other Changes
* Update map editor functionality. [#114](https://github.com/ngocjohn/vehicle-status-card/pull/114)
* Update action configuration and indicator schemas. [#115](https://github.com/ngocjohn/vehicle-status-card/pull/115)


**Full Changelog**: [v1.11.0...v1.11.2](https://github.com/ngocjohn/vehicle-status-card/compare/v1.11.0...v1.11.2)

[Changes][v1.11.2]


<a id="v1.11.0"></a>
# [v1.11.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.11.0) - 2025-05-16

<!-- Release notes generated using configuration in .github/release.yml at v1.11.0 -->

## What's Changed
### New Features 🎉
* **Standalone Mini Map Card with MapTiler Theme**
Added support for displaying the mini map as a full, standalone card on the dashboard. This new feature replicates the functionality of the native Home Assistant map card while incorporating the custom MapTiler-based styling for a consistent visual theme. Users can now integrate the map view more flexibly within their dashboard layouts.  [#109](https://github.com/ngocjohn/vehicle-status-card/pull/109)

![feat-single-maps](https://github.com/user-attachments/assets/e0b87bc4-106b-4f79-bcda-1bfc8adbb252)


### Fixes 🐛
* Fixed image entity handling in both the editor and slide components  [#106](https://github.com/ngocjohn/vehicle-status-card/pull/106)


**Full Changelog**: [v1.10.0...v1.11.0](https://github.com/ngocjohn/vehicle-status-card/compare/v1.10.0...v1.11.0)

[Changes][v1.11.0]


<a id="v1.10.0"></a>
# [v1.10.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.10.0) - 2025-05-07

## What's Changed

### New Features 🎉
* Introduced label mode and attribute configuration options for map markers.  
  This allows more control over how marker data is displayed, making the map more informative and customizable. [#101](https://github.com/ngocjohn/vehicle-status-card/pull/101)

* Added support for aspect ratio configuration.  
  Users can now adjust the map popup's layout proportions to better fit different dashboard designs. [#102](https://github.com/ngocjohn/vehicle-status-card/pull/102)

### Other Changes
* Refactored components to implement `VicTab` and `VicTabBar`.  
[#103](https://github.com/ngocjohn/vehicle-status-card/pull/103)

**Full Changelog**: [v1.9.0...v1.10.0](https://github.com/ngocjohn/vehicle-status-card/compare/v1.9.0...v1.10.0)

[Changes][v1.10.0]


<a id="v1.9.0"></a>
# [v1.9.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.9.0) - 2025-04-14

<!-- Release notes generated using configuration in .github/release.yml at v1.9.0 -->

## What's Changed

### New Features 🎉

- **Zone Name Display on Mini Map**  [#89](https://github.com/ngocjohn/vehicle-status-card/pull/89)  
  You can now choose to display the Home Assistant Zone name on the mini map when your vehicle is parked within a defined zone. If the vehicle is outside any zone, the address will be shown instead. This feature is controlled via a new boolean configuration option.

![map-zone](https://github.com/user-attachments/assets/d5fe1f88-085a-4ab4-8a05-78adac09e2ec)


- **Enhanced Progress Bar Styling**  [#96](https://github.com/ngocjohn/vehicle-status-card/pull/96)  
  Added new styling options for the progress bar, allowing customization of height, width, and border radius to better match your theme.

![progress-bar](https://github.com/user-attachments/assets/996e4ac7-2023-44b3-94a9-7d527819b773)

### Fixes 🐛

- **Improved Button Actions & Swipe Detection**  [#93](https://github.com/ngocjohn/vehicle-status-card/pull/93)  
  Refactored the handling of button actions and swipe gestures to improve responsiveness and reliability.

### Other Changes

- **Dynamic Pagination Bullets for Image Slider**  [#90](https://github.com/ngocjohn/vehicle-status-card/pull/90)  
  Added support for dynamic bullets in the image slider's pagination and included an option to hide pagination bullets entirely.

---

**Full Changelog**: [v1.8.2...v1.9.0](https://github.com/ngocjohn/vehicle-status-card/compare/v1.8.2...v1.9.0)

[Changes][v1.9.0]


<a id="v1.8.2"></a>
# [v1.8.2](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.8.2) - 2025-03-31

## What's Changed

🚀 **The card is now available in [HACS](https://hacs.xyz/)!**  
If you find this card helpful, please consider giving the repository a ⭐ on GitHub or [Buy me a coffee](https://buymeacoffee.com/ngocjohn) ☕ 

Thank you!

### New Features 🎉
- Added configuration options to customize the mini map display, and optimized overall rendering performance ([#81](https://github.com/ngocjohn/vehicle-status-card/pull/81))
- Introduced support for color templates in the panel range info component, allowing more flexible styling ([#82](https://github.com/ngocjohn/vehicle-status-card/pull/82))
- Enabled setting a custom history period for data shown in the map popups, enhancing data control ([#83](https://github.com/ngocjohn/vehicle-status-card/pull/83))

### Fixes 🐛
- Fixed an issue where the save button in the card editor didn't properly persist changes ([#85](https://github.com/ngocjohn/vehicle-status-card/pull/85))

### Other Changes
- Refactored how marker positions are calculated and updated on the map for better accuracy and maintainability ([#86](https://github.com/ngocjohn/vehicle-status-card/pull/86))

**Full Changelog**: [v1.8.1...v1.8.2](https://github.com/ngocjohn/vehicle-status-card/compare/v1.8.1...v1.8.2)

[Changes][v1.8.2]


<a id="v1.8.1"></a>
# [v1.8.1](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.8.1) - 2025-03-20

<!-- Release notes generated using configuration in .github/release.yml at v1.8.1 -->

## What's Changed
### 🎉 New Features
- **Added Path Color Option**: Now you can customize the path color in the minimap settings. [#80](https://github.com/ngocjohn/vehicle-status-card/pull/80)

### 🛠️ Bug Fixes
- **Fixed History Data Retrieval**: Resolved an issue where the function to fetch history data was not working correctly.

🔗 **Full Changelog**: [Compare v1.8.0 → v1.8.1](https://github.com/ngocjohn/vehicle-status-card/compare/v1.8.0...v1.8.1)

[Changes][v1.8.1]


<a id="v1.8.0"></a>
# [v1.8.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.8.0) - 2025-03-15

<!-- Release notes generated using configuration in .github/release.yml at v1.8.0 -->

## What's Changed
### New Features 🎉
* Add history tracking with MapTiler service by [@ngocjohn](https://github.com/ngocjohn) in [#79](https://github.com/ngocjohn/vehicle-status-card/pull/79)

![location-history](https://github.com/user-attachments/assets/b78324b4-3629-4727-b99f-2a90c5c880cc)


### Fixes 🐛
* Improve button configuration update handling by [@ngocjohn](https://github.com/ngocjohn) in [#78](https://github.com/ngocjohn/vehicle-status-card/pull/78)


**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.7.0...v1.8.0

[Changes][v1.8.0]


<a id="v1.7.0"></a>
# [v1.7.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.7.0) - 2025-02-19

<!-- Release notes generated using configuration in .github/release.yml at v1.7.0 -->

## What's Changed
This release introduces support for the MapTiler API key, providing a new popup map design and improved mapping functionality. 

If you find this card helpful, please consider giving the repository a ⭐! 

### New Features 🎉
* Added icon_template to with picture_template. Allows more dynamic icon display.  [#72](https://github.com/ngocjohn/vehicle-status-card/pull/72)
* Added MapTiler API key support to enhance the mapping functionality. [#73](https://github.com/ngocjohn/vehicle-status-card/pull/73)

![maptiler-map-popup](https://github.com/user-attachments/assets/bd575f30-8d2f-4cfc-b9e2-151486bf6137)


**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.6.0...v1.7.0

[Changes][v1.7.0]


<a id="v1.6.0"></a>
# [v1.6.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.6.0) - 2025-01-27

<!-- Release notes generated using configuration in .github/release.yml at v1.6.0 -->

## What's Changed
### New Features 🎉
* Add image entity support [#62](https://github.com/ngocjohn/vehicle-status-card/pull/62)
Introduce support for image entities, allowing dynamic image rendering based on entity states. This enhancement includes new interfaces and methods for image handling, improving the overall functionality and user experience.

### Fixes 🐛
* Improve action configuration handling by [@ngocjohn](https://github.com/ngocjohn) in [#57](https://github.com/ngocjohn/vehicle-status-card/pull/57)

If you find this card helpful, please consider giving the repository a ⭐! 

**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.5.0...v1.6.0

[Changes][v1.6.0]


<a id="v1.5.0"></a>
# [v1.5.0](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.5.0) - 2025-01-15

<!-- Release notes generated using configuration in .github/release.yml at v1.5.0 -->

## What's Changed
This release introduces exciting new features, including section order customization, enhanced map functionality with address display.

If you find this card helpful, please consider giving the repository a ⭐! 

### New Features 🎉
* **Section Order Customization** [#47](https://github.com/ngocjohn/vehicle-status-card/pull/47)
Introduced the ability to define the order of sections in the card, providing greater flexibility in customizing the layout.

![benz-section-order2](https://github.com/user-attachments/assets/610bd5e8-1ddb-4be2-a34c-acceb4efb439)
![benz-section](https://github.com/user-attachments/assets/af1ca788-0a00-45e4-9f84-19c9d7a44c08)
![benz-map-anim](https://github.com/user-attachments/assets/db730a3e-9d76-49d6-a0c5-39e2ca0c04e6)

* Add charging entity support and an animated charging icon [#53](https://github.com/ngocjohn/vehicle-status-card/pull/53)
![charging-icon](https://github.com/user-attachments/assets/c4dae2e8-822f-44bb-8905-7f0327e30ece)

* Add action configuration handling for indicators [#55](https://github.com/ngocjohn/vehicle-status-card/issues/55) 
Introduce action configuration for single and group indicator items, enabling customizable actions based on user interactions.

### 🛠️ Improvements
* Enhance address formatting by [@ngocjohn](https://github.com/ngocjohn) in [#52](https://github.com/ngocjohn/vehicle-status-card/pull/52)


**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.4.3...v1.5.0

[Changes][v1.5.0]


<a id="v1.4.3"></a>
# [v1.4.3](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.4.3) - 2024-12-22

<!-- Release notes generated using configuration in .github/release.yml at v1.4.3 -->

## What's Changed
### Fixes 🐛
* Fix: Update leaflet tile provider [#45](https://github.com/ngocjohn/vehicle-status-card/pull/45)


**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.4.2...v1.4.3

[Changes][v1.4.3]


<a id="v1.4.2"></a>
# [v1.4.2](https://github.com/ngocjohn/vehicle-status-card/releases/tag/v1.4.2) - 2024-12-09

<!-- Release notes generated using configuration in .github/release.yml at v1.4.2 -->

## What's Changed
### New Features 🎉
* Add color template for pressure state in tire card by [@ngocjohn](https://github.com/ngocjohn) in [#37](https://github.com/ngocjohn/vehicle-status-card/pull/37)
* Add picture template to Button config by [@ngocjohn](https://github.com/ngocjohn) in [#40](https://github.com/ngocjohn/vehicle-status-card/pull/40)


**Full Changelog**: https://github.com/ngocjohn/vehicle-status-card/compare/v1.4.0...v1.4.2

[Changes][v1.4.2]


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


[v1.15.2]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.15.1...v1.15.2
[v1.15.1]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.14.0...v1.15.1
[v1.14.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.13.1...v1.14.0
[v1.13.1]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.13.0...v1.13.1
[v1.13.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.12.1...v1.13.0
[v1.12.1]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.12.0...v1.12.1
[v1.12.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.11.3...v1.12.0
[v1.11.3]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.11.2...v1.11.3
[v1.11.2]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.11.0...v1.11.2
[v1.11.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.10.0...v1.11.0
[v1.10.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.9.0...v1.10.0
[v1.9.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.8.2...v1.9.0
[v1.8.2]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.8.1...v1.8.2
[v1.8.1]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.8.0...v1.8.1
[v1.8.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.7.0...v1.8.0
[v1.7.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.6.0...v1.7.0
[v1.6.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.5.0...v1.6.0
[v1.5.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.4.3...v1.5.0
[v1.4.3]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.4.2...v1.4.3
[v1.4.2]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.4.0...v1.4.2
[v1.4.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.3.1...v1.4.0
[v1.3.1]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.3.0...v1.3.1
[v1.3.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.2.0...v1.3.0
[v1.2.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.1.1...v1.2.0
[v1.1.1]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.1.0...v1.1.1
[v1.1.0]: https://github.com/ngocjohn/vehicle-status-card/compare/v1.0.0...v1.1.0
[v1.0.0]: https://github.com/ngocjohn/vehicle-status-card/tree/v1.0.0

<!-- Generated by https://github.com/rhysd/changelog-from-release v3.9.0 -->
