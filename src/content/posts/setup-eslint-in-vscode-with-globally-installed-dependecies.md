---
title: 'Setup eslint in vscode with globally installed dependencies'
description: 'Guide how to setup eslint in vscode with globally installed dependencies instead of locally installed dependencies in the project'
pubDate: 'Feb 23 2023'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['engineering']
---

This is a guide how to setup eslint in vscode with globally installed dependencies instead of locally installed dependencies in the project

I am currently switching from IntelliJ platform to vscode. During the process I am loosing quite some learned convenience features (like basic linting errors for js apps). Now I am trying to replicate as much as possible.

In the steps below I will describe how to get eslint working in a vscode workspace without adding the dependencies to the local project.

1. Create a .eslintrc.cjs file in your project root. What is important here: import the extended config (if you have one) via the filepath. Add the file to the .gitignore if needed.

```js
/**
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true
    },
    extends: [
        require.resolve('/Users/patrik.simms/.nvm/versions/node/v18.9.0/lib/node_modules/eslint-config-standard'),
    ],
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
    },
    rules: {
        indent: ['error', 4]
    }
}
```
2. Install the eslint (and plugins & extend) dependencies globally with the following command. I used the js standard config, adjust to your needs.

```sh
npm -g eslint eslint-config-standard eslint-plugin-import eslint-plugin- eslint-plugin-promise
```
3. Add the following 2 eslint options to your settings.json of vscode. They are needed so your plugins can be resolved from the global installation directory. Make sure you adjust the paths to your global installation directory.

```json
{
	"eslint.nodePath": "/Users/patrik.simms/.nvm/versions/node/v18.9.0/lib/node_modules",
	"eslint.options.resolvePluginsRelativeTo": "/Users/patrik.simms/.nvm/versions/node/v18.9.0/lib/node_modules"
}
```
🎉Happy linting
