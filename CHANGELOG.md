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

## 1.7.4 (2026-07-14)
### Added
- Added a new feature: Multilingual support
- Added a new source for CHANGELOG

### Changed
- None

### Removed
- None


---

## 1.7.3 (2026-07-11)
### Added
- Added a small new feature: now it can remember what you filled in on a survey and offer a 'one-click fill' option when you encounter the same survey again.

### Changed
- None

### Removed
- None


---

## 1.7.1 (2026-07-09)
### Added
- Added 'Update Log' in the settings page.

### Changed
- Changed the logic of the version checker and added more sources.
- Fix the issue where clicking the button in the old version doesn't automatically check.

### Removed
- None

---

## 1.7.0 (Abandon)(2026-07-08)
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
