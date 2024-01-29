# ng-css-to-tailwind (experiment)

A tool that helps migrate your Angular project from any CSS solution to Tailwind.

## How to use

### 1. Install

`npm i -D ng-css-to-tailwind`

### 2. Build output css file

Running `ng build` will create file **dist/styles.css**

> I recommend commenting out Tailwind for this step:

```css
/* styles.css */
/* @tailwind base; */
/* @tailwind components; */
/* @tailwind utilities; */
```

### 3. Use tool

Print changes into stdout\
`ng-css-to-tailwind analyze <file>`

Write changes to a file\
`ng-css-to-tailwind analyze <file> --write`

#### Flags

| Flag            | Description                             | Defaults           |
| --------------- | --------------------------------------- | ------------------ |
| help            | Print help                              |                    |
| version         | Print version                           |                    |
| css_file        | Location of css file                    | dist/styles.css    |
| tailwind_file   | Location of tailwind config file        | tailwind.config.js |
| write           | Write changes to file                   | false              |
|gclass_blacklist | List of classes to ignore, support glob | []                 |
