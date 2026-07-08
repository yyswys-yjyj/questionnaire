# Changelog

We note the change of our project.

---

## [Unreleased]
### Added
- None

### Changed
- None

### Removed
- None

---

## 1.7.0 (2026-07-08)
### Added
- Rewrite the memory management system. Now data types are pretty much free from the limitations of `JavaScript Number`.
- A new `#gc` macro has been added. In the new memory management system, its function is to delete a variable definition.
- Added the `QInitCode`, so that AI can use it to initialize the questionnaire.
- For `QInitCode`, added the **Dynamic Question Type Registration System**. Now AI can register a questionnaire type.

### Changed
- In QLang, the way of getting Qid has been changed. **But** this is **not compatible with old questionnaires**.
- Made a lot of changes to the questionnaire renderer, mainly for the QInitCode feature.

### Removed
- None