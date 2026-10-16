# Text Functions

String manipulation, text transformation, and pattern matching functions.

Covers: Conversion, Extraction, Case Transformation, Text Matching, Concatenation, Search & Replace

---

## Quick Reference

| Function       | Purpose            | Syntax Example                            |
| -------------- | ------------------ | ----------------------------------------- |
| TEXT       | Convert to text    | `TEXT(123.45)` -> "123.45"                 |
| VALUE      | Convert to number  | `VALUE("123.45")` -> 123.45                |
| LEN        | String length      | `LEN("Hello")` -> 5                        |
| LEFT       | Left N characters  | `LEFT("Hello", 2)` -> "He"                 |
| MID        | Middle substring   | `MID("Hello", 2, 3)` -> "ell"              |
| RIGHT      | Right N characters | `RIGHT("Hello", 2)` -> "lo"                |
| LOWER      | Lowercase          | `LOWER("Hello")` -> "hello"                |
| UPPER      | Uppercase          | `UPPER("Hello")` -> "HELLO"                |
| PROPER     | Title case         | `PROPER("hello world")` -> "Hello World"   |
| TRIM       | Remove spaces      | `TRIM("  hello  ")` -> "hello"             |
| CONTAINS   | Check substring    | `CONTAINS("ell", "Hello")` -> TRUE         |
| STARTSWITH | Check prefix       | `STARTSWITH("He", "Hello")` -> TRUE        |
| ENDSWITH   | Check suffix       | `ENDSWITH("lo", "Hello")` -> TRUE          |
| &          | Concatenate        | `"Hello" & " " & "World"` -> "Hello World" |
| FIND       | Find position      | `FIND("ell", "Hello")` -> 2                |
| SUBSTITUTE | Replace text       | `SUBSTITUTE("Hello", "l", "L")` -> "HeLLo" |

---

## Conversion Functions

### TEXT

Convert a number or integer to text.

Syntax: `TEXT(Value)`

Examples:

```pigment
TEXT(123.456)        // "123.456"
TEXT(-44.23)         // "-44.23"
```

---

### VALUE

Convert text to number. Available as `NUMBER` (interchangeable alias).

Syntax: `VALUE(Text)` or `NUMBER(Text)`

Examples:

```pigment
VALUE("123")                                           // 123
VALUE("123.45")                                        // 123.45
VALUE("-99.9")                                         // -99.9
```

Key Point: Returns BLANK if text is not numeric.

---

## Extraction Functions

### LEN

Get string length.

Syntax: `LEN(Text)`

Examples:

```pigment
LEN("Hello")                                            // 5
LEN("Hello World")                                      // 11
LEN("")                                                 // 0
```

---

### LEFT

Extract N characters from left.

Syntax: `LEFT(Text, Count)`

Examples:

```pigment
LEFT("Hello World", 5)                                  // "Hello"
LEFT("ABC123", 3)                                       // "ABC"
LEFT("abc", 5)                                          // "abc" (count exceeds length - all returned)
LEFT('Product'.'SKU', 2)                                // First 2 characters of SKU
```

Key Point: Returns BLANK if Count is a negative integer.

---

### MID

Extract substring from middle.

Syntax: `MID(Text, Start, Count)`

Parameters:

- Start: Starting position (1-based)
- Count: Number of characters to extract

Examples:

```pigment
MID("Hello World", 7, 5)                                // "World"
MID("ABC123DEF", 4, 3)                                  // "123"
MID('Product'.'SKU', 3, 4)                              // Characters 3-6 of SKU
```

Key Point: Returns BLANK if Start is 0/negative or if Count is negative.

---

### RIGHT

Extract N characters from right.

Syntax: `RIGHT(Text, Count)`

Examples:

```pigment
RIGHT("Hello World", 5)                                 // "World"
RIGHT("ABC123", 3)                                      // "123"
RIGHT("abc", 5)                                         // "abc" (count exceeds length - all returned)
RIGHT('Product'.'SKU', 2)                               // Last 2 characters of SKU
```

Key Point: Returns BLANK if Count is a negative integer.

---

## Case Transformation

### LOWER

Convert to lowercase.

Syntax: `LOWER(Text)`

Examples:

```pigment
LOWER("HELLO")                                          // "hello"
LOWER("Hello World")                                    // "hello world"
LOWER('Product'.'Name')                                 // Lowercase product name
```

---

### UPPER

Convert to uppercase.

Syntax: `UPPER(Text)`

Examples:

```pigment
UPPER("hello")                                          // "HELLO"
UPPER("Hello World")                                    // "HELLO WORLD"
UPPER('Customer'.'Email')                               // Uppercase email
```

---

### PROPER

Capitalize the first letter of the string and every letter that follows a non-alphabetic character (spaces, digits, punctuation, symbols). All other letters become lowercase.

Syntax: `PROPER(Text)`

Examples:

```pigment
PROPER("hello world")                                   // "Hello World"
PROPER("JOHN SMITH")                                    // "John Smith"
PROPER("c@ss n1te")                                     // "C@Ss N1Te" (digits/symbols trigger capitalization)
PROPER('Customer'.'Name')                               // Title case name
```

---

## Text Cleaning

### TRIM

Removes leading and trailing spaces, and replaces multiple internal spaces with a single space.

Syntax: `TRIM(Text)`

Examples:

```pigment
TRIM("  hello  ")                // "hello"
TRIM("hello   world")            // "hello world"
TRIM("  this   is   a test  ")   // "this is a test"
```

---

## Text Matching

### CONTAINS

Check if text contains a substring (not case sensitive by default).

Syntax: `CONTAINS(Text to Find, Text to Search [, Starting Position to Search] [, Is Case Sensitive])`

Examples:

```pigment
CONTAINS("World", "Hello World")    // TRUE
CONTAINS("world", "Hello World")    // TRUE (not case sensitive by default)
CONTAINS("premium", 'Product'.'Description')  // Check for keyword
CONTAINS("A", "abc", 1, TRUE)       // FALSE (case sensitive)
```

Common Use: Filtering, keyword search, text matching

---

### STARTSWITH

Check if text starts with a prefix (not case sensitive by default).

Syntax: `STARTSWITH(Start Text, Text to Search [, Is Case Sensitive])`

Examples:

```pigment
STARTSWITH("Hello", "Hello World")  // TRUE
STARTSWITH("world", "Hello World")  // FALSE
STARTSWITH("PRD", 'Product'.'SKU')  // SKU starts with PRD
STARTSWITH("A", "abc", TRUE)        // FALSE (case sensitive)
```

---

### ENDSWITH

Check if text ends with a suffix (not case sensitive by default).

Syntax: `ENDSWITH(End Text, Text to Search [, Is Case Sensitive])`

Examples:

```pigment
ENDSWITH("World", "Hello World")    // TRUE
ENDSWITH("Hello", "Hello World")    // FALSE
ENDSWITH(".pdf", 'File'.'Name')     // Check file extension
ENDSWITH("C", "abc", TRUE)          // FALSE (case sensitive)
```

---

## Concatenation

### & Operator

Concatenate strings.

Syntax: `Text1 & Text2 & ...`

Examples:

```pigment
"Hello" & " " & "World"                                 // "Hello World"
'First Name' & " " & 'Last Name'                        // "John Smith"
'Product'.'Code' & "-" & 'Product'.'Version'           // "PRD-v1.2"
TEXT('Order'.'Number') & "-" & TEXT('Year')             // "1-2024"
```

Common Uses: Building composite keys, formatting display strings, creating labels

---

## Search & Replace

### FIND

Find position of a substring (not case sensitive by default, 1-based).

Syntax: `FIND(Text to Find, Text to Search [, Starting Position to Search] [, Is Case Sensitive])`

Examples:

```pigment
FIND("World", "Hello World")    // 7
FIND("l", "Hello")              // 3 (first occurrence)
FIND("x", "Hello")              // BLANK (not found)
FIND("A", "abc", 1, TRUE)       // BLANK (case sensitive)
```

Returns: Position (1-based), or BLANK if not found OR if the starting position is 0/negative.

---

### SUBSTITUTE

Replace one or all occurrences of a substring. Case sensitive (unlike CONTAINS/STARTSWITH/ENDSWITH/FIND).

Syntax: `SUBSTITUTE(Text, OldText, NewText [, OccurrenceNumber])`

Examples:

```pigment
SUBSTITUTE("aaa", "a", "b")         // "bbb" (all occurrences)
SUBSTITUTE("aaa", "a", "b", 2)      // "aba" (only second occurrence)
SUBSTITUTE("abc", "A", "d")         // "abc" (case sensitive - "A" not found)
```

Key Point: Returns BLANK if OccurrenceNumber is a negative integer.

---

## Common Patterns

### Pattern 1: Composite Key

```pigment
'Customer'.'Country' & "-" & 'Customer'.'ID'
```

### Pattern 2: Format Display Name

```pigment
PROPER('First Name' & " " & 'Last Name')
```

### Pattern 3: Extract SKU Prefix

```pigment
LEFT('Product'.'SKU', 3)
```

### Pattern 4: Clean and Uppercase Email

```pigment
UPPER(TRIM('User'.'Email'))
```

### Pattern 5: Check Category

```pigment
IF(CONTAINS("premium", 'Product'.'Name'), "Premium", "Standard")
```

### Pattern 6: Build Date Range Display

```pigment
TEXT('Start Date') & " - " & TEXT('End Date')
```

### Pattern 7: Extract Domain from User.Email

```pigment
MID(User.Email, FIND("@", User.Email) + 1, LEN(User.Email) - FIND("@", User.Email))
```

---

## Critical Rules

- Text matching is NOT case sensitive by default - CONTAINS, STARTSWITH, ENDSWITH, FIND (use optional `Is Case Sensitive` argument for case-sensitive matching)
- SUBSTITUTE is case sensitive - No optional argument to change this
- FIND returns BLANK if not found - Not 0. Also returns BLANK if starting position is 0/negative
- LEFT/RIGHT/MID return BLANK on negative counts - MID also returns BLANK on a 0/negative Start
- SUBSTITUTE can replace specific occurrence - Use optional occurrence argument
- TRIM removes leading/trailing spaces and replaces multiple internal spaces with single space
- FIND/MID positions are 1-based - Not 0-based
- & (ampersand) concatenates anything - Numbers, dates, text (auto-converts)
- Text functions are expensive - Minimize in loops or large calculations
- Pre-calculate in properties - Don't recalculate same text transformation in formulas
