# Third-party notices

Runtime dependencies are installed from npm. Each package ships its own license file in `node_modules/`:

| Package                                 | License                   |
| --------------------------------------- | ------------------------- |
| react, react-dom                        | MIT                       |
| react-router                            | MIT                       |
| @tanstack/react-query                   | MIT                       |
| react-hook-form, @hookform/resolvers    | MIT                       |
| zod                                     | MIT                       |
| lucide-react (icons)                    | ISC                       |
| clsx, tailwind-merge                    | MIT                       |
| @fontsource-variable/inter (Inter font) | SIL Open Font License 1.1 |
| leaflet                                 | BSD-2-Clause              |
| react-leaflet                           | Hippocratic License 2.1   |

## Map data and services

- **OpenStreetMap** tiles and **Nominatim** geocoding © OpenStreetMap contributors, ODbL. Tiles and search are used at low volume and follow the [tile](https://operations.osmfoundation.org/policies/tiles/) and [Nominatim](https://operations.osmfoundation.org/policies/nominatim/) usage policies: attribution is shown, and search runs on submit only, with no autocomplete.
- **Esri World Street Map / World Imagery** (alternative street layer and satellite layer): attribution is shown in the map. Review Esri's terms before any commercial deployment.

Tailwind CSS, Vite, TypeScript, ESLint, Prettier, Vitest and Testing Library are development-time tools only. They are not shipped in `dist/`.
