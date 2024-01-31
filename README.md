# ng-css-to-tailwind (experiment)

A tool that helps migrate your Angular project from any CSS solution to Tailwind.

## What it does?

It scans your CSS classes in an HTML file, finds CSS definitions, and converts them to **Tailwind** classes.

```html
<button class="btn btn-primary"></button
```

```css
.btn {
  padding: 1rem 2rem;
  border-right: 1rem;
}

.btn-primary {
  background: #0f0ff0;
  color: white;
}
```

```html
<!-- output html -->
<button class="px-8 py-4 border-r-[1rem] [background:#0f0ff0] text-[white]">
  Click me!
</button>
```

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

| Flag             | Description                             | Defaults           |
| ---------------- | --------------------------------------- | ------------------ |
| help             | Print help                              |                    |
| version          | Print version                           |                    |
| css_file         | Location of css file                    | dist/styles.css    |
| tailwind_file    | Location of tailwind config file        | tailwind.config.js |
| write            | Write changes to file                   | false              |
| gclass_blacklist | List of classes to ignore, support glob | []                 |
