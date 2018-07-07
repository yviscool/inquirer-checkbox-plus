# inquirer-checkbox-plus
Better [inquirer-checkbox-plus-prompt](https://github.com/faressoft/inquirer-checkbox-plus-prompt)



### Installation



### Usage



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