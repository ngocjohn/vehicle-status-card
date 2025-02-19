<a name="readme-top"></a>

[![hacs][hacs-validate]][hacs-url] ![Github last commit][git-last-commit-badge] ![git-download-all][git-download-all-badge] ![git-download-latest][git-download-latest-badge]

# 🚘 Vehicle status card

<a href="#"><img src="https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/vehicle-status-header.gif" style="border-radius: 8px"></a>


---

<p style="text-align: justify;">This is a custom Home Assistant card designed to display detailed status information about vehicles. It provides several features such as indicators, range progress bars, buttons for interacting with the vehicle's entities, and a mini map to track devices. The card is highly customizable with options to display various types of data and layouts.</p>


## Features

- **Indicators**: Display individual or grouped entity states on the header of the card.
- **Range Indicators**: Show progress bars for fuel, battery, or any entity with a range state.
- **Images**: Upload or add images for a slideshow display with customizable intervals.
- **Mini Map**: Track `device_tracker` entities using an integrated mini map.
- **Button Cards**: Set up primary/secondary buttons, icons, notifications, and default/custom cards to interact with vehicle entities.
- **Layout Configuration**: Customize the layout, theme, rows, and swipe functionality for button grids.



## Table of contents

<details>
    <summary>Table of contents</summary>

- [Overview](#vehicle-status-card)
- [Features](#features)
- [Installation](#installation)
  - [HACS Installation](#hacs-installation)
  - [Manual Installation](#manual-installation)
- [Configuration](#configuration)

</details>

# Installation

## [HACS](https://hacs.xyz) (Home Assistant Community Store)

1. Go to HACS page on your Home Assistant instance
2. Add this repository via HACS Custom repositories [How to add Custom Repositories](https://hacs.xyz/docs/faq/custom_repositories/)

```
https://github.com/ngocjohn/vehicle-status-card
```

3. Select `Lovelace`
1. Press add icon and search for `Vehicle status card`
1. Select Vehicle status card repo and install
1. Force refresh the Home Assistant page `Ctrl` + `F5` / `Shift` + `⌘` + `R`
1. Add vehicle-status-card to your page

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=ngocjohn&repository=vehicle-status-card&category=plugin)

## Manual

<details>
  <summary>Click to expand installation instructions</summary>

1. Download the [vehicle-status-card.js](https://github.com/ngocjohn/vehicle-status-card/releases/latest).
2. Place the downloaded file on your Home Assistant machine in the `config/www` folder (when there is no `www` folder in the folder where your `configuration.yaml` file is, create it and place the file there).
3. In Home Assistant go to `Configuration->Lovelace Dashboards->Resources` (When there is no `resources` tag on the `Lovelace Dashboard` page, enable advanced mode in your account settings, and retry this step).
4. Add a new resource:
   - Url = `/local/vehicle-status-card.js`
   - Resource type = `module`
5. Force refresh the Home Assistant page `Ctrl` + `F5` / `Shift` + `⌘` + `R`.
6. Add vehicle-status-card to your page.

</details>

# Configuration
<!--README-CONTENT-START-->

# Indicators Configuration

## Single Indicators

Single indicators are used to display the state of a single entity, such as a sensor or binary sensor, on the card's header. These indicators are ideal for showcasing key information like vehicle battery level, engine status, or lock state. Each single indicator displays the current state of the entity with an optional icon for better visualization.

For example, a single indicator can be used to show whether a car door is locked or unlocked, or to display the remaining battery percentage of the vehicle.

## Group Indicators

Group indicators allow you toThis is useful when you want to track the status of related entities together, such as all door locks or all tire pressures. Group indicators display a summary view of the entities they contain, giving you a quick snapshot of their states.

For instance, you could create a group indicator to monitor the lock status of all car doors, or to show the pressure levels of all tires at once. Group indicators help to keep the interface cleaner and more organized by bundling similar entities together.

![Indicators](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-indicators.gif)


# Range Info Bars

Range info bars are used to display progress bars for entities that represent a measurable range, such as fuel levels, battery charge, or remaining range. These bars provide a visual representation of how much of a resource is left, making it easy to monitor critical vehicle metrics at a glance.

### Key Features of Range Info Bars

- **Energy Level**: Track the remaining battery or fuel levels of the vehicle. This can represent the percentage or the exact value, such as kilometers or liters remaining.
- **Range Level**: Visualize how far the vehicle can travel with the remaining energy or fuel. This is particularly useful for electric vehicles or vehicles with long-range capabilities.
- **Progress Color**: Customize the color of the progress bar to better indicate the status (e.g., green for sufficient range, red for low range).

Range info bars help users keep track of their vehicle’s vital statistics in an intuitive and easy-to-read format, ensuring they always know when they need to refuel or recharge.

![Range info bars](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-range-info.gif)


# Images slides

Image slides allow you to upload or link images that will be displayed in a rotating slideshow on the card. This feature can be used to showcase vehicle-related images, such as maps, dashboards, or even real-time snapshots from cameras.

### Key Features

- **Image Upload**: You can upload images directly or link to external image URLs.
- **Slideshow**: The images can automatically cycle through at set intervals, offering a dynamic visual experience.
- **Customization**: Control the dimensions of the images, the transition effects between slides, and various other options to customize the slideshow to your liking.

### New Swiper Configuration Options

The latest release introduces advanced swiper configuration options, allowing for more control over how images are displayed.

### Swiper Configurable Options:

- **Max Height**: Set the maximum height for the image slides.
- **Max Width**: Set the maximum width for the image slides.
- **Autoplay**: Automatically transition between images after a specified delay.
- **Loop**: Whether the slideshow should loop indefinitely.
- **Delay**: The amount of time (in milliseconds) each image stays on screen before transitioning to the next.
- **Speed**: How fast the transition between images happens (in milliseconds).
- **Effect**: Choose between different transition effects for the slideshow:
  - `slide`: A classic sliding effect.
  - `fade`: A smooth fade between images.
  - `coverflow`: A 3D coverflow effect that adds depth to the transition.

![Images slides](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-images.gif)


# Mini map

The mini map feature displays a real-time map within the card, tracking the location of a `device_tracker` entity. This is especially useful for monitoring the current location of your vehicle or other trackable devices.

### Key Features

- **Real-Time Tracking**: Display the live location of your vehicle using any `device_tracker` entity.
- **Custom Zoom Level**: Adjust the default zoom level to focus on the area around the tracked device.
- **Theming**: Customize the map’s appearance by setting a light, dark, or automatic theme based on time or user preference.

The mini map provides an easy way to keep track of where your vehicle is at all times, directly on the card.

### Maptiler Popup
<details>

<summary>How to get API Key</summary>

For detailed maps popup, get a MapTiler API Key by following these steps:

   1. Create free account
      <https://www.maptiler.com/>
   2. Copy new key
      <https://cloud.maptiler.com/account/keys/>
   3. In config editor paste key into Mini Map configuration > Maptiler API
   4. Click Save

</details>

![Config mini map](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-mini-map.gif)


# Button card

The button card is a core feature that provides interactive buttons to control or monitor specific entities in your vehicle. Each button can be customized with a primary label, secondary information, icons, and notifications.

## Single Button Configuration

A single button allows you to represent an entity or action related to your vehicle. You can set up the button’s appearance, behavior, and actions to suit your needs.

### Key Features

- **Primary Label**: The main label on the button, usually indicating the action or entity (e.g., "Lock Doors").
- **Secondary Info**: Additional details below the primary label, such as the state of an entity (e.g., "Locked" or "Unlocked").
- **Icon**: Customize the icon displayed on the button to visually represent the entity or action (e.g., a lock or fuel pump).
- **Notifications**: Set up conditional notifications to alert you when certain states occur (e.g., when the fuel level is low).
- **Action Types**: New feature that allows you to configure different types of actions for the button, such as `tap`, `hold`, or `double_tap` actions.

### Action Type

The **Action Type** feature allows you to define what action should be triggered when interacting with a button. Each button can have multiple action types configured, giving you more control over how the button behaves. You can specify different actions for tapping, holding, or double tapping the button.

#### Supported Action Types:

- **tap_action**: The action triggered when the button is tapped.
- **hold_action**: The action triggered when the button is held down.
- **double_tap_action**: The action triggered when the button is double tapped.

#### Available Actions:

- `more-info`: Opens the more-info dialog of the entity.
- `toggle`: Toggles the state of the entity (e.g., from `on` to `off`).
- `call-service`: Calls a Home Assistant service (e.g., `lock.lock`).
- `navigate`: Navigates to a specified path or view in the interface.
- `url`: Opens a specific URL.

![Config button](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-button.gif)

## Default Card

The default card configuration allows you to display a set of related entities with their states in a structured way. This card can display multiple pieces of information, such as sensor readings or status indicators, in a compact and organized format.

### Key Features

- **Title**: Each default card can have a title to define the category of items being displayed (e.g., "Fuel Status" or "Vehicle Locks").
- **Collapsible Sections**: You can optionally make sections of the card collapsible, allowing users to hide or show the details as needed.
- **Items**: Display a list of entities with their states, icons, and labels. This provides a clear overview of the current status of various vehicle sensors or controls (e.g., tire pressure, battery status).

The default card is perfect for grouping and displaying related entities in one place, giving users an at-a-glance view of the vehicle’s key metrics or controls.

![Config Default Card](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-default-card.gif)

## Custom Card

The custom card configuration allows you to integrate any Home Assistant-supported card into the vehicle status card. This feature gives you full flexibility to display or interact with various entities using custom Lovelace cards.

### Key Features

- **Full Lovelace Support**: You can embed any Lovelace card configuration, such as entity cards, glance cards, or custom third-party cards.
- **Custom Layout**: Customize the layout and appearance of the card to suit your preferences, allowing you to display more complex data or control options.
- **Entity Control**: Use custom cards to control specific entities or display detailed information, such as real-time vehicle metrics or custom sensor data.

This powerful feature allows you to extend the functionality of the vehicle status card by adding any custom elements or controls that fit your needs.

![Config Custom Card](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-custom-card.gif)

## Tire Pressures Card

The **Tire Pressures Card** allows users to monitor and display the tire pressures of their vehicle in a highly customizable manner. This card provides a visual representation of the vehicle’s tires, allowing users to assign specific entities to each tire and customize the background image, layout, and size.

This card is designed to give users a clear, at-a-glance view of their tire pressure status, ensuring they can easily monitor and respond to any issues that may arise.

### Key Features

- **Custom Background**: Upload or link to a custom image of your vehicle, allowing for a personalized layout.
- **Tire Pressure Monitoring**: Assign specific Home Assistant entities to each tire to display real-time pressure readings.
- **Customizable Layout**: You can adjust the size, position, and orientation of the vehicle image and tire indicators.
- **Responsive Design**: Ensure the card fits neatly within your dashboard, adapting to different screen sizes and layouts.

### Tire Pressure Card Configuration

The card supports complete customization, from setting the vehicle's background image to adjusting the size and positioning of tire pressure indicators.

#### Available Options:

- **Background Image**: Set a custom image of your vehicle (or any image of your choice) as the background to enhance the visual appeal of the tire pressures display.
- **Tire Entities**: Define which Home Assistant entities should be used for each tire (front left, front right, rear left, rear right).s
- **Image Size & Position**: Customize the size and position of the background image, ensuring that the tire pressure indicators fit well within the image.
- **Orientation**: Choose whether the layout should be horizontal or vertical, allowing you to display the tires in the correct orientation based on the background image.

  ![Config Tire Pressures Card](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-tire-card.gif)


# Layout configurations

The layout configuration controls how elements within the vehicle status card are displayed, including themes, grid layout, and visibility of certain components.

### Key Features

- **Theme Configuration**: Customize the card’s appearance with a chosen theme (`auto`, `light`, or `dark` mode), allowing you to match it with your Home Assistant interface or personal preference.
- **Button Grid Layout**: Control the layout of the buttons by specifying the number of rows (`rows`) and whether swipe gestures (`swipe`) are enabled for easier navigation, especially on mobile devices.
- **Visibility Controls**: Choose which elements to show or hide on the card, including:
  - **Button Notify**: Show or hide notification indicators on buttons.
  - **Mini Map**: Toggle the visibility of the mini map.
  - **Buttons, Indicators, Range Info, and Images**: Control the visibility of each major card component, making it easy to declutter the interface based on user preference.

This configuration gives you full flexibility to design the card’s layout and optimize it for different devices or user preferences.

![Config layout](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-layout.gif)


<!--README-CONTENT-END-->
---
&copy; 2024 Viet Ngoc

[https://github.com/ngocjohn/](https://github.com/ngocjohn/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!--Badges-->
[hacs-validate]: https://github.com/ngocjohn/vehicle-status-card/actions/workflows/validate.yaml/badge.svg
[hacs-url]: https://github.com/ngocjohn/vehicle-status-card/actions/workflows/validate.yaml
[git-last-commit-badge]: https://img.shields.io/github/last-commit/ngocjohn/vehicle-status-card
[git-download-all-badge]: https://img.shields.io/github/downloads/ngocjohn/vehicle-status-card/total?style=flat&logo=homeassistantcommunitystore&logoSize=auto&label=Downloads&color=%2318BCF2
[git-download-latest-badge]: https://img.shields.io/github/downloads/ngocjohn/vehicle-status-card/latest/total?style=flat&logo=homeassistantcommunitystore&logoSize=auto
<!--Urls-->

