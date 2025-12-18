## Пороект представляет собой кинотеку с полнотекстовып поиском по названию, описанию и субтитрам (если есть)
Поиск реализован средствами postgres

В проекте используется api kinopoisk и opensubtitles

## Запуск

npm install (может понадобится флаг --legacy-peer-deps)

src/config/api-dist.ts - ключи изменяем на свои данные и переименовываем в api.ts

## Сборка

### npm run build 
Сайт собирается в папку dist

##  Тесты

### npm test
Unit тесты

### npm run test:e2e
e2e тесты

### npm run test-storybook
Storybook тесты

### Скриншоты выполнения тестов находятся в папке tests_screenshots