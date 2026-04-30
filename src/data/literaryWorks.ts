import type { Grade } from '../types';

export interface LiteraryWork {
  title: string;
  author: string;
  period: string;
  gradeLabel?: string;
}

export const literaryWorksByGrade: Record<Grade, LiteraryWork[]> = {
  '7': [
    { title: 'На прощаване в 1868 г.', author: 'Христо Ботев', period: 'Възраждане' },
    { title: 'Немили-недраги', author: 'Иван Вазов', period: 'Възраждане' },
    { title: 'Една българка', author: 'Иван Вазов', period: 'Възраждане' },
    { title: 'Опълченците на Шипка', author: 'Иван Вазов', period: 'Възраждане' },
    { title: 'Българският език', author: 'Иван Вазов', period: 'Възраждане' },
    { title: 'До Чикаго и назад', author: 'Алеко Константинов', period: 'Критически реализъм' },
    { title: 'Бай Ганьо', author: 'Алеко Константинов', period: 'Критически реализъм' },
    { title: 'Неразделни', author: 'Пенчо Славейков', period: 'Модернизъм' },
    { title: 'Заточеници', author: 'Пейо Яворов', period: 'Символизъм' },
    { title: 'По жътва', author: 'Елин Пелин', period: 'Реализъм' },
    { title: 'По жицата', author: 'Йордан Йовков', period: 'Реализъм' },
  ],
  '10': [
    { title: 'Азбучна молитва', author: 'Константин Преславски', period: 'Средновековие' },
    { title: 'За буквите', author: 'Черноризец Храбър', period: 'Средновековие' },
    { title: 'История славянобългарска', author: 'Паисий Хилендарски', period: 'Възраждане' },
    { title: 'Изворът на Белоногата', author: 'Петко Р. Славейков', period: 'Възраждане' },
    { title: 'Левски', author: 'Иван Вазов', period: 'Възраждане' },
    { title: 'Под игото', author: 'Иван Вазов', period: 'Възраждане' },
    { title: 'Бай Ганьо се върна от Европа', author: 'Алеко Константинов', period: 'Критически реализъм' },
    { title: 'Cis moll', author: 'Пенчо Славейков', period: 'Модернизъм' },
    { title: 'Арменци', author: 'Пейо Яворов', period: 'Символизъм' },
    { title: 'Две хубави очи', author: 'Пейо Яворов', period: 'Символизъм' },
    { title: 'В часа на синята мъгла', author: 'Пейо Яворов', period: 'Символизъм' },
    { title: 'Да се завърнеш в бащината къща', author: 'Димчо Дебелянов', period: 'Символизъм' },
    { title: 'Гераците', author: 'Елин Пелин', period: 'Реализъм' },
    { title: 'Септември', author: 'Гео Милев', period: 'Експресионизъм' },
    { title: 'Зимни вечери', author: 'Христо Смирненски', period: 'Постсимволизъм' },
    { title: 'Повест', author: 'Атанас Далчев', period: 'Предметен реализъм' },
    { title: 'Индже', author: 'Йордан Йовков', period: 'Реализъм' },
    { title: 'Албена', author: 'Йордан Йовков', period: 'Реализъм' },
    { title: 'Тютюн', author: 'Димитър Димов', period: 'Модернизъм' },
    { title: 'Дърво без корен', author: 'Николай Хайтов', period: 'Съвременна литература' },
    { title: 'Нежната спирала', author: 'Йордан Радичков', period: 'Съвременна литература' },
  ],
  '12': [
    { title: 'Железният светилник', author: 'Димитър Талев', period: 'След Освобождението', gradeLabel: '11 клас' },
    { title: 'Бай Ганьо журналист', author: 'Алеко Константинов', period: 'Критически реализъм', gradeLabel: '11 клас' },
    { title: 'Балкански синдром', author: 'Станислав Стратиев', period: 'Съвременна драма', gradeLabel: '11 клас' },
    { title: 'Паисий', author: 'Иван Вазов', period: 'Възраждане', gradeLabel: '11 клас' },
    { title: 'История', author: 'Никола Вапцаров', period: 'Социален реализъм', gradeLabel: '11 клас' },
    { title: 'Ноев ковчег', author: 'Йордан Радичков', period: 'Съвременна литература', gradeLabel: '11 клас' },
    { title: 'Борба', author: 'Христо Ботев', period: 'Възраждане', gradeLabel: '11 клас' },
    { title: 'Андрешко', author: 'Елин Пелин', period: 'Реализъм', gradeLabel: '11 клас' },
    { title: 'Приказка за стълбата', author: 'Христо Смирненски', period: 'Постсимволизъм', gradeLabel: '11 клас' },
    { title: 'Крадецът на праскови', author: 'Емилиян Станев', period: 'Съвременна литература', gradeLabel: '11 клас' },
    { title: 'При Рилския манастир', author: 'Иван Вазов', period: 'Възраждане', gradeLabel: '11 клас' },
    { title: 'Спи езерото', author: 'Пенчо Славейков', period: 'Модернизъм', gradeLabel: '11 клас' },
    { title: 'Градушка', author: 'Пейо Яворов', period: 'Символизъм', gradeLabel: '11 клас' },
    { title: 'Аз искам да те помня все така...', author: 'Димчо Дебелянов', period: 'Символизъм', gradeLabel: '12 клас' },
    { title: 'Колко си хубава', author: 'Христо Фотев', period: 'Съвременна лирика', gradeLabel: '12 клас' },
    { title: 'Посвещение', author: 'Петя Дубарова', period: 'Съвременна лирика', gradeLabel: '12 клас' },
    { title: 'Спасова могила', author: 'Елин Пелин', period: 'Реализъм', gradeLabel: '12 клас' },
    { title: 'Ветрената мелница', author: 'Елин Пелин', period: 'Реализъм', gradeLabel: '12 клас' },
    { title: 'Молитва', author: 'Атанас Далчев', period: 'Предметен реализъм', gradeLabel: '12 клас' },
    { title: 'Вяра', author: 'Никола Вапцаров', period: 'Социален реализъм', gradeLabel: '12 клас' },
    { title: 'Песента на колелетата', author: 'Йордан Йовков', period: 'Реализъм', gradeLabel: '12 клас' },
    { title: 'Балада за Георг Хених', author: 'Виктор Пасков', period: 'Съвременна литература', gradeLabel: '12 клас' },
    { title: 'Потомка', author: 'Елисавета Багряна', period: 'Модернизъм', gradeLabel: '12 клас' },
    { title: 'Две души', author: 'Пейо Яворов', period: 'Символизъм', gradeLabel: '12 клас' },
    { title: 'Честен кръст', author: 'Борис Христов', period: 'Съвременна лирика', gradeLabel: '12 клас' },
  ],
};
