# next

- [fork] scoped from [georender-pack@4.2.5](https://www.npmjs.com/package/georender-pack)
- [encode] major: changes the encoding and decoding schema to include additional values based on tags. if no additional tags are included, then only an additional 0 is written to the end of the buffer
- [schema] minor: adds the georender schema here, local to the repo to track changes.
- [encode] minor: preserve `alt_name:{lang}` as different from `name:{lang}`
- [decode] minor: export baseFields, enabling consumers to understand what is part of the base of georender and what is a tag beyond that.
