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
  * `/[to]` - Send Circles to a specific contact
* `/settings` - Change app settings

