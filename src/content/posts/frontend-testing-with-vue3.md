---
title: 'Frontend Testing with Vue3 and jest'
description: 'Vuejs 3 is stable since September 2020. From my experience, the ecosystem is not. This is a short introduction how to setup jest in vue3 and what you can do with it'
pubDate: 'Mar 26 2021'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['engineering']
---

Vuejs 3 is stable since September 2020. From my experience, the ecosystem is not. This is a short introduction how to setup jest in vue3 and what you can do with it.

Vue 3 Core has been on a stable releases since 18.9.2020. You may think the ecosystem around has been upgraded since then. From my experience: It has not. At least not completly.

This "guide" shows you one possible integration of jest in vue3. TLDR: If you want to know HOW to do it, install [these](https://www.psimms.de/frontend-testing-with-vue3/#needed-dependencies) dependencies and add [this](https://www.psimms.de/frontend-testing-with-vue3/#needed-configuration) config. If you want to know WHAT you can do, this could be intersting for you.

### Before vue3
For vue 2 there is a comprehensive plugin called [@vue/cli-plugin-jest](https://cli.vuejs.org/core-plugins/unit-jest.html) which includes all needed dependencies and config for executing tests with jest including all the vue stuff like shallowMounting components. This library simply does not exist as of march 2021 for vue3.

## Needed Dependencies
By default, a vue application uses vue-cli as a dev server, which compiles the Single File Components (SFC) to javascript, which the browser (or tools like babel & jest) can understand. If you want to use SFC in your jest tests, you need to install the [@vue/compiler-sfc](https://github.com/vuejs/vue-next/tree/master/packages/compiler-sfc) manually.

To tell jest to actually use the compiler, you need a tool called [vue-jest](https://github.com/vuejs/vue-jest/tree/v3).

If you want to test the behavior of your components, you need to instantiate & mount your components like you would do in the application itself. But since you dont want to mount your whole app in tests, you want to mount single components by test. The library [@vue/vue-test-utils](https://github.com/vuejs/vue-test-utils) provides a convenient api to mount or shallowMount (more on that later).

Furthermore you need a library called [babel-jest](https://www.npmjs.com/package/babel-jest). This peer depencency is responsible for compiling your vue code (which uses es6 modules) to commonjs (which uses the "require" syntax), so jest can understand it. <u>Update:</u> There seems to be a way to use es6 modules in jest in versions >= 25, but in my case the test still does not work with es6 modules.

All of these librarys are peer depencencies, so you have to install them by yourself. Pay attention to choose the right version of the depencencies, from my experience using not the latest versions of all tools can cause a lot of trouble.

All of the above may vary if you use typescript.

```json
{
	...
	"devDependencies": {
    	"@vue/test-utils": "^2.0.0-rc.1",
    	"@vue/compiler-sfc": "^3.0.5",
    	"babel-jest": "^26.6.3",
    	"jest": "^26.6.3",
    	"vue-jest": "^5.0.0-0"
	}
}
```
## Needed Configuration
This one is actually pretty straight forward if you now what to configure (by the fact which libaries to use)

If you dont have a babel config already, add the following or extend it by this:

```js
module.exports = {
  //...
  presets: [
    ['@babel/preset-env',
      {
        modules: 'commonjs',
        targets: {
          node: 'current'
        }
      }
    ]
  ],
  //...
}
```
Then add transforms and globals to your jest config and add the .vue file extension.

```js
module.exports = {
  //...
  globals: {
    'vue-jest': {
      babelConfig: true // using the babel.config.js of the project
    }
  },
  transform: {
    '^.+\\.vue$': 'vue-jest', // using the vue-jest dependency to transpire Vue SFC to commonjs
    '^.+\\js$': 'babel-jest'  // using babel-jest to compile js files to commonjs via babel
  },
  moduleFileExtensions: ['vue', 'js', 'json']
  //...
}
```
## What you can do with jest & vue
I won't go over the basics with jest here, there are already tutorials from more expierenced people out there. For the sake of simplicity, I will focus on mounting, accessing static parts of a vue component and mocking.

### Static Parts of Components
Methods and Prop validators are non dynamic parts of a component, independently of the current state of the app (this one is only partly true since methods could acccess the state, but the methods are compiled the same way every time). For testing these, you dont have to mount the component (which reduced side effects and is faster). Take this example:

```ts
// the following validator returns true if the prop is 1
test('test prop validator', () => {
    const input = 1
    expect(SomeComponent.props.propValue.validator(input)).toBe(true)
  })
```
It works the same way with methods. But keep in mind that some of your methods could depend on e.g. the data object, which is not defined here.

```ts
// the following method returns true of the inputvalue is 1
test('test prop validator', () => {
    const input = 1
    expect(SomeComponent.methods.someMethod.validator(input)).toBe(true)
  })
```
### Mounting
There are basically 2 possibilities: mounting and shallowMounting. Mounting mounts your component like in the normal application, so including every child component. This takes time and may not be necessary for your test. Shallowmounting instead "stubs" your child-components, so it creates some stubs in the template and therefore will not mount it.

```vue-html
<!-- vue template with some custom component called e-button -->
<div>
    <e-button />  
</div>

<!-- "mounted" template -->
<div>
    <button value="someValue" />
</div>

<!-- "shallowMounted" template -->
<div>
    <e-button-stub />
</div>
```

### Mocking
By default, jest uses [jsdom](https://github.com/jsdom/jsdom) as its test environment. jsdom is basically a subset of the features a browser provides executed in nodejs. But since it does not implement all features of a browser, some things are not testable by default in jest. A good example is the javasript object "window". It is not defind with its default children in jsdom, like you know it from your normal browser environment. But jest allows you to create mocks for nearly all of these things. Take a look:

```vue-html
// snippet from SomeComponent-----------------------
<template>
    <button id="button-1" @click="someMethod()"
</template>
// ...
someMethod() {
    window.alert('🍺🍺🍺')
}
```

```js
beforeEach(() => {
    Object.assign(window, { // window object does not exist in JSDom
      alert: jest.fn(alertMessage => {
        console.log(`Alert has been called with !${alertMessage}`)
      })
    })
  })

  test('trigger button and look if window.alert is called', async () => {
    const component = shallowMount(SomeComponent, {
      props: { // this way you an pass props and data directly into the component as it is mounted
        value: 'a'
      },
      data () {
        return {
          someData: 'Hello'
        }
      }
    })

    const button = component.get('#button-1')
    await button.trigger('click')
    expect(window.alert).toBeCalledTimes(1)
    expect(window.alert).toHaveBeenCalledWith('🍺🍺🍺')
  })
```

This testcase will result in the following:


passing tests🎉
## Conclusion
I hope some of this information is useful for you, I wish a had such example for integrating jest in vue3. Keep in mind that jest is still a tool for unit/ integration tests. Although you can nearly mock everything from a browse, it does not mean you should.
