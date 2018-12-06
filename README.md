# inquirer-checkbox-plus
 Inspired by [inquirer-checkbox-plus-prompt](https://github.com/faressoft/inquirer-checkbox-plus-prompt)


### Installation

``` shell
npm install inquirer-checkbox-plus
```

### Usage

```javascript
inquirer.registerPrompt('checkbox-plus', require('inquirer-checkbox-plus'));

inquirer.prompt({
  type: 'checkbox-plus',
  ...
})
```

### options

Takes `type`, `name`, `message`, `source`[, `filter`, `validate`, `default`, `pageSize`, `highlight`, `searchable`, `enablebackspace`, `answer`,`footer`,`header`,`keypress`,`searching`,`noresult`] properties.

* **highlight**:  (Function/Boolean)
* **answer**:  (Function)
* **header**: (Function/String)
* **footer**: (Function/String)
* **searching**: (Function/String)
* **noresult**: (Function/String)
* **enablebackspace**: (Boolean) If `true`, backspace will not emit `keypress` event
* **keypress** : (Function), args (events, validation, prompt), events is a observable which can bind any keypress event, validation is observable which can be used with events, prompt is this 

see `example.js`

### category 


![demo](https://github.com/yviscool/inquirer-checkbox-plus/blob/master/demo.gif)


Do not enable `searchable` options.


```javascript
inquirer.prompt([{
    type: 'checkbox-plus',
    ...
    source: function (answersSoFar, input) {

        return Promise.resolve(...)

    },
    subsource: function (choice, type) {
    	...
        return Promise.resolve([])
    }
}])atch(console.log)
```

use `gg/G` key to return the top/bottom. `h/l` key to change the cagetory.

see `example01.js`



