# Circles code quest

Goal of this code quest is to create a simple web wallet that allows users to use Circles with MetaMask.

## Requirements

You will need to have the following installed:

* MetaMask browser extension
* Node.js and npm

Further you will need to have some xDAI in your MetaMask wallet. You can get some xDAI from
the [Gnosis Chain Faucet](https://faucet.gnosischain.com/).

## 1. Create a svelte kit project

 ```bash
 npm create svelte@latest circles-app
 # Choose the following options:
 # * Skeleton project
 # * TypeScript
 
 cd circles-app
 npm install
 
 # Check if the app starts
 npm run dev
 ```

## 2. Create the routes

The app will have the following onboarding routes:

* `/` - Home page
* `/connect-wallet` - Connect to metamask
* `/register-new` - Register a connected wallet with Circles

The app will have the following main routes:

* `/contacts` - Show and edit trust relationships
    * `/add` - Add a new contact (trust someone)
* `/dashboard` - Show recent wallet activity
* `/send` - Send Circles
    * `/[[to]]` - Send Circles to a specific contact
* `/settings` - Change app settings

```bash
mkdir -p src/routes/connect-wallet
mkdir -p src/routes/register-new
mkdir -p src/routes/contacts/add
mkdir -p src/routes/dashboard
mkdir -p src/routes/send/[[to]]
mkdir -p src/routes/settings
```

# 3. Install tailwindcss

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

In `tailwind.config.js`, add the following:

```js
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],

    // ...

}
```

Create a `./src/app.css` file and add the `@tailwind` directives for each of Tailwind’s layers:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 4. Create the main layout
