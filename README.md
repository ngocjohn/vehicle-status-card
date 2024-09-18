<a name="readme-top"></a>

# 🚘 Vehicle status card

<a href="#"><img src="https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/vehicle-status-header.gif" style="border-radius: 8px"></a>


##

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

## Installation

### [HACS](https://hacs.xyz) (Home Assistant Community Store)

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

### Manual

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

## Configuration

## Indicators Configuration

- **Single Indicators**

  Single indicators are used to display the state of a single entity, such as a sensor or binary sensor, on the card's header. These indicators are ideal for showcasing key information like vehicle battery level, engine status, or lock state. Each single indicator displays the current state of the entity with an optional icon for better visualization.

  For example, a single indicator can be used to show whether a car door is locked or unlocked, or to display the remaining battery percentage of the vehicle.

- **Group Indicators**

  Group indicators allow you to combine multiple entities under a single group. This is useful when you want to track the status of related entities together, such as all door locks or all tire pressures. Group indicators display a summary view of the entities they contain, giving you a quick snapshot of their states.

  For instance, you could create a group indicator to monitor the lock status of all car doors, or to show the pressure levels of all tires at once. Group indicators help to keep the interface cleaner and more organized by bundling similar entities together.

![Indicators](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-indicators.gif)

## Range Info Bars

Range info bars are used to display progress bars for entities that represent a measurable range, such as fuel levels, battery charge, or remaining range. These bars provide a visual representation of how much of a resource is left, making it easy to monitor critical vehicle metrics at a glance.

### Key Features of Range Info Bars

- **Energy Level**: Track the remaining battery or fuel levels of the vehicle. This can represent the percentage or the exact value, such as kilometers or liters remaining.
- **Range Level**: Visualize how far the vehicle can travel with the remaining energy or fuel. This is particularly useful for electric vehicles or vehicles with long-range capabilities.
- **Progress Color**: Customize the color of the progress bar to better indicate the status (e.g., green for sufficient range, red for low range).

Range info bars help users keep track of their vehicle’s vital statistics in an intuitive and easy-to-read format, ensuring they always know when they need to refuel or recharge.

![Range info bars](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-range-info.gif)

## Image Slides

Image slides allow you to upload or link images that will be displayed in a rotating slideshow on the card. This feature can be used to showcase vehicle-related images, such as maps, dashboards, or even real-time snapshots from cameras.

### Key Features

- **Image Upload**: You can upload images directly or link to external image URLs.
- **Slideshow**: The images can automatically cycle through at set intervals, offering a dynamic visual experience.
- **Customization**: Set the duration of each slide and control the display order.

This feature adds a more personalized and visual element to your card, enhancing the overall presentation of vehicle data.

![Images slides](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-images.gif)

## Mini Map

The mini map feature displays a real-time map within the card, tracking the location of a `device_tracker` entity. This is especially useful for monitoring the current location of your vehicle or other trackable devices.

### Key Features

- **Real-Time Tracking**: Display the live location of your vehicle using any `device_tracker` entity.
- **Custom Zoom Level**: Adjust the default zoom level to focus on the area around the tracked device.
- **Theming**: Customize the map’s appearance by setting a light, dark, or automatic theme based on time or user preference.

The mini map provides an easy way to keep track of where your vehicle is at all times, directly on the card.

![Config mini map](https://raw.githubusercontent.com/ngocjohn/vehicle-status-card/main/assets/config-mini-map.gif)

# Button Card

The button card is a core feature that provides interactive buttons to control or monitor specific entities in your vehicle. Each button can be customized with a primary label, secondary information, icons, and notifications.

## Single Button Configuration

A single button allows you to represent an entity or action related to your vehicle, such as toggling a lock, turning on lights, or showing the fuel level. You can set up the button’s appearance and behavior to suit your needs.

### Key Features

- **Primary Label**: The main label on the button, usually indicating the action or entity (e.g., "Lock Doors").
- **Secondary Info**: Additional details below the primary label, such as the state of an entity (e.g., "Locked" or "Unlocked").
- **Icon**: Customize the icon displayed on the button to visually represent the entity or action (e.g., a lock or fuel pump).
- **Notifications**: Set up conditional notifications to alert you when certain states occur (e.g., when the fuel level is low).

The single button configuration gives you control over the key vehicle functions, allowing quick interaction and feedback directly from the card.

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

## Layout Configuration

The layout configuration controls how elements within the vehicle status card are displayed, including themes, grid layout, and visibility of certain components.

### Key Features

- **Theme Configuration**: Customize the card’s appearance with a chosen theme (`auto`, `light`, or `dark` mode), allowing you to match it with your Home Assistant interface or personal preference.
- **Button Grid Layout**: Control the layout of the buttons by specifying the number of rows (`rows`) and whether swipe gestures (`swipe`) are enabled for easier navigation, especially on mobile devices.
- **Visibility Controls**: Choose which elements to show or hide on the card, including:
  - **Button Notify**: Show or hide notification indicators on buttons.
  - **Mini Map**: Toggle the visibility of the mini map.
  - **Buttons, Indicators, Range Info, and Images**: Control the visibility of each major card component, making it easy to declutter the interface based on user preference.

This configuration gives you full flexibility to design the card’s layout and optimize it for different devices or user preferences.

---

###

&copy; 2024 Viet Ngoc

[https://github.com/ngocjohn/](https://github.com/ngocjohn/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>
