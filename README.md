### Проект Workout Meals ™ состоит из четырёх магазинов: [Workout Meals ™](https://workoutmeals.myshopify.com/admin), [Workout Meals PreProd](https://workout-meals-preprod.myshopify.com/admin), [Workout Meals Retail](https://workoutmealsretail.myshopify.com/admin) и [Mamma Mia](https://mamma-mia-by-workout-meals.myshopify.com/admin) ###

# ПОДКЛЮЧЕН DeployBot!!! #

## Копии тем ##
* theme -> Starter GWA Prod-live : branch -> master
* theme -> [Theme-Starter GWA Pre-Prod-live](https://workoutmeals.myshopify.com/admin) & [Starter GWA Pre-prod](https://workout-meals-preprod.myshopify.com/admin) : branch -> pre-production
* theme -> Starter GWA Dev - ...* : branch -> соответсвующаяя задаче

* theme -> Retail Starter GWA Prod-live : branch -> master-retail
* theme -> Retail Starter GWA Pre-Prod : branch -> pre-production-retail
* theme -> Retail Starter GWA Dev - ...* : branch -> соответсвующаяя задаче

* theme -> Mamma Mia GWA Production : branch -> master-mamma-mia
* theme -> Mamma Mia GWA PreProduction : branch -> pre-production-mamma-mia
* theme -> Mamma Mia GWA dev - ...* : branch -> соответсвующаяя задаче

*- любая из букв которые еще не были использованы (можно первую букву имени разработчика).

## Новые задачи: ##
1. Клонируем к себе репозиторий
2. От главной ветки нужного проекта(master или master-retail или master-mamma-mia) создаём себе отдельную ветку, название ветки должно совпадать с номером карточки в JIRA + краткое описание (пример: WM-500-Theme-switch), тогда ветка сразу автоматически подтянется в разделе РАЗРАБОТКА. Если по доставшейся задаче уже велась работа другим разработчиком и от этой задачи необходимо создать новую ветку, то в её названии мы будем это указывать (пример: WM-500-Theme-switch-2)
3. В админке нужного магазина создаём себе рабочую тему (дублируем живую тему и переименовываем).
4. Приступаем к реализации задачи.
5. После завершения реализации задачи делаем коммит, пушим комит в глобальную среду. Сообщение коммита - номером карточки в JIRA + краткое описание задачи и можно дописать что было сделано (хотяб парой слов в скобках)
6. Переходим на ветку pre_production(нужного проекта) делаем Git pull на свою локальную ветку.
7. Далее мёрджим изменения со своей ветки с задачей к ветке pre_production(нужного проекта).
8. Пушим изменения в глобальную среду.
9. После этого в течении 15минут DeployBot проливает изменения в нужные темы.
10. Отписываемся в карточке и даём ссылку для тестирования на нужные темы.
11. После того как задача протестирована и менеджер даёт добро на перенос функционала на живую тему, переходим на ветку master(нужного проекта) делаем Git pull на свою локальную ветку, лучше сделать theme download с темы живой темы и тогда если были какие либо изменения сделать коммит содержания: "[update] theme download дата когда было сделано", коммит пушим в глобальную среду.
12. Далее к ветке master(нужного проекта) мёрджим изменения со своей ветки с задачей(т.к. на ветке pre_production есть правки деплой которых назначен на определённую дату), пушим в глобальное пространство и в течении 15минут DeployBot проливает изменения в нужные темы.

## Особенность проекта ##
* Тема проекта - "самописсная", т.е. изначально проект собирался на [Slate](https://bitbucket.org/genovawebart/workout-meals-slate-storefront/src/master/) , но из-за того что технология устарела, поддерживать стало не удобно, так что теперь работа происходит через Theme Kit. 
* Код в темах Theme-Starter GWA Pre-Prod-live & Starter GWA Pre-prod совпадает и лежит в репозитории на ветке pre-production
* Новые магазины Workout Meals Retail и Mamma Mia были созданы с темы Workout Meals ™, но частично функционал отличается
* Для магазина Mamma Mia паралельно с разработкой начала подчищать стилевой файл, вот блоки которые нужно будет постаратся применять в дальнейшем: /*================ Color Variables ================*/ , /*================ Typography Variables ================*/ , размеры заголовков h1, .h1... , .page-width , /*================ Links & Buttons ================*/