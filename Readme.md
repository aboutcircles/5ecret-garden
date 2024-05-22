# Circles code quest

Goal of this code quest is to create a simple web wallet that allows users to use Circles with MetaMask.

## Requirements

You will need to have the following installed:

* MetaMask browser extension
* Node.js and npm
* A Svelte plug-in for your editor
    * https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode
    * https://plugins.jetbrains.com/plugin/12375-svelte

Further you will need to have some xDAI in your MetaMask wallet. You can get some xDAI from
the [Gnosis Chain Faucet](https://faucet.gnosischain.com/).

If you have issues with the faucet you can add your address in this pad: https://pad.riseup.net/p/qIjqGoMHAaNg5wGYAtEB

## Steps

The repository contains different branches that can be individually checked out to see the progress of the code quest.

1. [create-ui-mockup](https://github.com/aboutcircles/circles-code-quest/tree/create-ui-mockup)  
   Contains all required UI components and some CSS
2. [add-and-initialize-circles-sdk](https://github.com/aboutcircles/circles-code-quest/tree/add-and-initialize-circles-sdk)  ([Diff](https://github.com/aboutcircles/circles-code-quest/compare/create-ui-mockup...add-and-initialize-circles-sdk))  
   Adds the @circles-sdk to the project and initializes it
2. [register-at-circles ](https://github.com/aboutcircles/circles-code-quest/tree/register-at-circles) ([Diff](https://github.com/aboutcircles/circles-code-quest/compare/add-and-initialize-circles-sdk...register-at-circles))  
   Adds logic to registers a person at Circles
3. [show-balance](https://github.com/aboutcircles/circles-code-quest/tree/show-balance) ([Diff](https://github.com/aboutcircles/circles-code-quest/compare/register-at-circles...show-balance))  
   Adds logic to show the balance of a Circles account
4. [show-transaction-history](https://github.com/aboutcircles/circles-code-quest/tree/show-transaction-history) ([Diff](https://github.com/aboutcircles/circles-code-quest/compare/show-balance...show-transaction-history))  
   Adds logic to show the transaction history of a Circles account
4. [mint-personal-tokens](https://github.com/aboutcircles/circles-code-quest/tree/mint-personal-tokens) ([Diff](https://github.com/aboutcircles/circles-code-quest/compare/show-transaction-history...mint-personal-tokens))  
   Adds logic to mint personal tokens
5. [show-and-add-trust](https://github.com/aboutcircles/circles-code-quest/tree/show-and-add-trust) ([Diff](https://github.com/aboutcircles/circles-code-quest/compare/mint-personal-tokens...show-and-add-trust))  
   Adds logic to show, add and remove trust relations
6. [calculate-max-amount-and-transfer](https://github.com/aboutcircles/circles-code-quest/tree/calculate-max-amount-and-transfer) ([Diff](https://github.com/aboutcircles/circles-code-quest/compare/show-and-add-trust...calculate-max-amount-and-transfer))  
   Adds calls to the pathfinder to determine the max. transferable amount and to transfer tokens

After you checked out a branch, install the dependencies with `npm install` and start the development server
with `npm run dev`.