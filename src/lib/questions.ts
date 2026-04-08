import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { generateQuizQuestions } from './gemini';

export interface Question {
  id: string;
  question: string;
  options?: string[];
  correctAnswer?: number;
  correctAnswerText?: string;
  explanation?: string;
  category: string;
  type: 'multiple_choice' | 'open_ended' | 'matching' | 'essay' | 'lis' | 'multiple_choice_cloze' | 'passage';
  isMultiplayer: boolean;
  context?: string;
  matchingItems?: {
    left: string[];
    right: string[];
  };
}

export interface TestSection {
  sectionId: string;
  title: string;
  standaloneQuestions?: Question[];
  groups?: {
    groupId: string;
    passage: string;
    questions: Question[];
  }[];
}

export interface Test {
  testId: string;
  grade: number;
  sections: TestSection[];
}

export async function getQuestions(grade: string, category: string, isMultiplayer: boolean = false) {
  try {
    // Convert grade string to number for DB query if needed
    const gradeNum = parseInt(grade);
    
    console.log(`getQuestions called for grade: ${grade} (num: ${gradeNum}), category: ${category}, isMultiplayer: ${isMultiplayer}`);
    
    // 1. Fetch tests for the specific grade
    const testsRef = collection(db, 'tests');
    const q = query(testsRef, where('grade', '==', gradeNum));
    const querySnapshot = await getDocs(q);
    console.log(`Firestore query returned ${querySnapshot.size} tests for grade ${gradeNum}`);
    
    let allQuestions: Question[] = [];
    
    querySnapshot.forEach((doc) => {
      const testData = doc.data() as Test;
      console.log(`Processing test: ${testData.testId} (Grade: ${testData.grade}) with ${testData.sections.length} sections`);
      testData.sections.forEach(section => {
        if (section.standaloneQuestions) {
          console.log(`Section ${section.sectionId} has ${section.standaloneQuestions.length} standalone questions`);
          allQuestions.push(...section.standaloneQuestions);
        }
        if (section.groups) {
          section.groups.forEach(group => {
            console.log(`Group ${group.groupId} in section ${section.sectionId} has ${group.questions.length} questions`);
            
            // Split passage into Text 1 and Text 2 if needed
            const passages = group.passage.split(/\n\n(?=ТЕКСТ [12])/);
            
            passages.forEach((p, pIdx) => {
              allQuestions.push({
                id: `${group.groupId}_p${pIdx}`,
                question: p.startsWith('ТЕКСТ') ? p.split('\n')[0] : `Текст ${pIdx + 1}`,
                context: p,
                type: 'passage',
                category: 'reading',
                isMultiplayer: false
              } as Question);
            });

            const groupQuestions = group.questions.map(q => ({
              ...q,
              context: q.context || group.passage // Use group passage as context if not already set
            }));
            allQuestions.push(...groupQuestions);
          });
        }
      });
    });

    console.log(`Total questions collected from DB: ${allQuestions.length}`);
    
    // 2. Filter by category
    let filteredQuestions = allQuestions;
    
    if (category === 'full_test') {
      // For full test, we want to preserve the order of sections and insert passages from ONE test
      let fullTestQuestions: Question[] = [];
      
      // We only take the FIRST test found in the collection for the "Full Test" experience
      // or we could filter by a specific testId if we had one.
      if (!querySnapshot.empty) {
        const testData = querySnapshot.docs[0].data() as Test;
        testData.sections.forEach(section => {
          if (section.standaloneQuestions) {
            fullTestQuestions.push(...section.standaloneQuestions);
          }
          if (section.groups) {
            section.groups.forEach(group => {
              const passages = group.passage.split(/\n\n(?=ТЕКСТ [12])/);
              passages.forEach((p, pIdx) => {
                fullTestQuestions.push({
                  id: `${group.groupId}_p${pIdx}`,
                  question: p.startsWith('ТЕКСТ') ? p.split('\n')[0] : `Текст ${pIdx + 1}`,
                  context: p,
                  type: 'passage',
                  category: 'reading',
                  isMultiplayer: false
                } as Question);
              });
              fullTestQuestions.push(...group.questions);
            });
          }
        });
      }

      if (fullTestQuestions.length > 0) {
        console.log(`Full test generated with ${fullTestQuestions.length} questions from DB`);
        return fullTestQuestions.map(q => {
          const res: any = {
            id: q.id,
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer ?? -1,
            explanation: q.explanation || '',
            category: q.category,
            type: q.type
          };
          if (q.correctAnswerText !== undefined) res.correctAnswerText = q.correctAnswerText;
          if (q.context !== undefined) res.context = q.context;
          if (q.matchingItems !== undefined) res.matchingItems = q.matchingItems;
          return res;
        });
      }
    }

    if (category === 'reading') {
      // For reading comprehension, we want ONE random group (passage + its 8 questions)
      const allReadingGroups: { passage: string, questions: Question[], testId: string }[] = [];
      
      querySnapshot.forEach((doc) => {
        const testData = doc.data() as Test;
        testData.sections.forEach(section => {
          if (section.groups) {
            section.groups.forEach(group => {
              if (group.questions.some(q => q.category === 'reading')) {
                allReadingGroups.push({
                  passage: group.passage,
                  questions: group.questions,
                  testId: testData.testId
                });
              }
            });
          }
        });
      });

      if (allReadingGroups.length > 0) {
        const randomGroup = allReadingGroups[Math.floor(Math.random() * allReadingGroups.length)];
        const readingQuestions: Question[] = [];
        
        // Split passage into Text 1 and Text 2
        const passages = randomGroup.passage.split(/\n\n(?=ТЕКСТ [12])/);
        passages.forEach((p, pIdx) => {
          readingQuestions.push({
            id: `reading_p${pIdx}_${randomGroup.testId}`,
            question: p.startsWith('ТЕКСТ') ? p.split('\n')[0] : `Текст ${pIdx + 1}`,
            context: p,
            type: 'passage',
            category: 'reading',
            isMultiplayer: false
          } as Question);
        });

        // Add the 8 questions
        readingQuestions.push(...randomGroup.questions);

        console.log(`Reading comprehension generated with ${readingQuestions.length} items from test ${randomGroup.testId}`);
        return readingQuestions.map(q => {
          const res: any = {
            id: q.id,
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer ?? -1,
            explanation: q.explanation || '',
            category: q.category,
            type: q.type
          };
          if (q.correctAnswerText !== undefined) res.correctAnswerText = q.correctAnswerText;
          if (q.context !== undefined) res.context = q.context;
          if (q.matchingItems !== undefined) res.matchingItems = q.matchingItems;
          return res;
        });
      }
    }

    if (category !== 'all' && category !== 'full_test') {
      // Exclude essay/thesis questions from regular category practice unless it's the writing category
      if (category !== 'writing') {
        filteredQuestions = filteredQuestions.filter(q => q.type !== 'essay' && !q.id.endsWith('q40'));
      }

      if (category === 'grammar' || category === 'spelling') {
        filteredQuestions = filteredQuestions.filter(q => 
          q.category === 'grammar' || q.category === 'spelling' || q.category === 'punctuation' || q.category === 'vocabulary'
        );
      } else if (category === 'reading') {
        filteredQuestions = filteredQuestions.filter(q => q.category === 'reading');
      } else if (category === 'writing') {
        filteredQuestions = filteredQuestions.filter(q => q.category === 'writing');
      } else {
        filteredQuestions = filteredQuestions.filter(q => q.category === category);
      }
    }

    console.log(`[getQuestions] Questions after category filter (${category}): ${filteredQuestions.length}`);
    if (filteredQuestions.length > 0) {
      console.log(`[getQuestions] Sample question category: ${filteredQuestions[0].category}`);
    }

    // 3. Filter by type (QuizView expects multiple choice with options, or matching, or open_ended)
    if (!isMultiplayer) {
      const beforeTypeFilter = filteredQuestions.length;
      filteredQuestions = filteredQuestions.filter(q => 
        q.type === 'multiple_choice' || 
        q.type === 'multiple_choice_cloze' ||
        q.type === 'matching' || 
        q.type === 'open_ended' ||
        q.type === 'essay' ||
        q.type === 'lis' ||
        q.type === 'passage' ||
        (q.options && q.options.length > 0)
      );
      console.log(`[getQuestions] Questions after single-player type filter: ${filteredQuestions.length} (removed ${beforeTypeFilter - filteredQuestions.length})`);
    } else {
      // Multiplayer ONLY supports multiple choice questions with options
      const beforeTypeFilter = filteredQuestions.length;
      filteredQuestions = filteredQuestions.filter(q => 
        (q.type === 'multiple_choice' || q.type === 'multiple_choice_cloze') && 
        q.options && q.options.length > 0
      );
      console.log(`[getQuestions] Questions after multiplayer type filter: ${filteredQuestions.length} (removed ${beforeTypeFilter - filteredQuestions.length})`);
    }

    // 4. Filter by multiplayer flag if requested
    if (isMultiplayer) {
      const beforeFlagFilter = filteredQuestions.length;
      filteredQuestions = filteredQuestions.filter(q => q.isMultiplayer);
      console.log(`[getQuestions] Questions after multiplayer flag filter: ${filteredQuestions.length} (removed ${beforeFlagFilter - filteredQuestions.length})`);
      
      // If we filtered out EVERYTHING because of the isMultiplayer flag, 
      // let's be more permissive and take some regular questions but mark them for multiplayer
      if (filteredQuestions.length === 0 && allQuestions.length > 0) {
        console.log(`[getQuestions] NO isMultiplayer questions found. Falling back to regular MC questions.`);
        filteredQuestions = allQuestions.filter(q => 
          (q.type === 'multiple_choice' || q.type === 'multiple_choice_cloze') && 
          q.options && q.options.length > 0
        );
      }
    }

    // 5. Fallback to Gemini DISABLED per user request
    if (allQuestions.length === 0) {
      console.log(`No questions found in DB for grade ${gradeNum}. AI generation is disabled.`);
      return [];
    }

    // If we have some questions but not for this category, and it's not full_test
    if (filteredQuestions.length === 0) {
      console.log(`No questions found for category "${category}" in DB. AI generation is disabled.`);
      return [];
    }

    console.log(`Using ${filteredQuestions.length} questions from database.`);
    
    // Custom selection logic for variety and count
    let selectedQuestions: Question[] = [];
    const targetCount = 15;

    if (category === 'grammar' || category === 'spelling') {
      // Separate 'lis' (punctuation/rewriting) questions
      const lisQuestions = filteredQuestions.filter(q => q.type === 'lis').sort(() => 0.5 - Math.random());
      const otherQuestions = filteredQuestions.filter(q => q.type !== 'lis').sort(() => 0.5 - Math.random());

      // Take max 1 LIS question
      if (lisQuestions.length > 0) {
        selectedQuestions.push(lisQuestions[0]);
      }

      // Fill the rest with other types
      const needed = targetCount - selectedQuestions.length;
      selectedQuestions.push(...otherQuestions.slice(0, needed));
      
      // Final shuffle
      selectedQuestions.sort(() => 0.5 - Math.random());
    } else {
      // For other categories, just take 15 random ones
      selectedQuestions = filteredQuestions
        .sort(() => 0.5 - Math.random())
        .slice(0, targetCount);
    }

    return selectedQuestions.map(q => {
      const res: any = {
        id: q.id,
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer ?? -1,
        explanation: q.explanation || '',
        category: q.category,
        type: q.type
      };
      if (q.correctAnswerText !== undefined) res.correctAnswerText = q.correctAnswerText;
      if (q.context !== undefined) res.context = q.context;
      if (q.matchingItems !== undefined) res.matchingItems = q.matchingItems;
      return res;
    });
    
  } catch (error) {
    console.error("CRITICAL ERROR in getQuestions:", error);
    return [];
  }
}

// Function to seed the initial test data
export async function seedInitialTestData() {
  console.log('seedInitialTestData: Starting seeding process...');
  const tests: Test[] = [
    {
      "testId": "matura_12_2022_august_FULL",
      "grade": 12,
      "sections": [
        {
          "sectionId": "part_1_grammar_spelling",
          "title": "Граматика и правопис",
          "standaloneQuestions": [
            { "id": "22q1", "category": "spelling", "type": "multiple_choice", "isMultiplayer": true, "question": "В кой ред думата е изписана правилно?", "options": ["А) азиятец", "Б) уповестявам", "В) злонамеренност", "Г) подложка"], "correctAnswer": 3 },
            { "id": "22q2", "category": "spelling", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната правописна грешка?", "options": ["А) Ще започна работа в Българската академия на науките.", "Б) Професията на пожарникара крие твърде много рискове.", "В) Лошо е да бъдеш тесногръд, когато работиш с хора.", "Г) За свободната позиция кандидатстваха трима бакалаври."], "correctAnswer": 1 },
            { "id": "22q3", "category": "spelling", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение НЕ е допусната правописна грешка?", "options": ["А) В седем дневен срок трябва да бъде внесен за разглеждане нов проект.", "Б) Трябва да науча репликите си на изуст, преди да отида на репетиция днес.", "В) Майка ми е почитателка на старите филми, черно белите са ѝ любими.", "Г) Тя взе своето съдбоносно решение, не мислейки за последствията от него."], "correctAnswer": 3 },
            { "id": "22q4", "category": "grammar", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение НЕ е допусната граматична грешка?", "options": ["А) Младият цигулар стана най-награждаваният български музикант.", "Б) За най-добро представяне са отличени българските и чешки участници.", "В) Вчера младата лекоатлетка спечели нейния първи златен медал.", "Г) Фирмата ще закупи още петдесет нови електрически автомобили."], "correctAnswer": 0 },
            { "id": "22q5", "category": "grammar", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната граматична грешка?", "options": ["А) Плуването влияе благоприятно върху двигателната, дихателната и нервната система.", "Б) Запознах се с писателя, чийто романи са преведени на почти всички европейски езици.", "В) Много доброволци се включиха в новата инициатива на Министерството на културата.", "Г) Господин Иванов, Вие лично сте поканен да присъствате на откриването на новата зала."], "correctAnswer": 1 },
            { "id": "22q6", "category": "punctuation", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната пунктуационна грешка?", "options": ["А) Голямата розова къща на хълма привличаше погледите на всички.", "Б) Науката, изучаваща значението на знаците, се нарича семиотика.", "В) Пожелавам Ви уважаеми колеги, успешна и спокойна седмица.", "Г) На срещата бяха поканени както децата, така и техните родители."], "correctAnswer": 2 },
            { "id": "22q7", "category": "punctuation", "type": "multiple_choice", "isMultiplayer": true, "question": "В коя от позициите, означени с букви, е допусната пунктуационна грешка?", "context": "Докато обмислях (А) къде да прекарам лятната си отпуска (Б) осъзнах, че пътешествията надалеч ще ми помогнат да се преборя със страховете си, (В) ще ме научат на търпение (Г) и ще ме накарат по-внимателно да преценявам непознати ситуации.", "options": ["А) А", "Б) Б", "В) В", "Г) Г"], "correctAnswer": 1 },
            { "id": "22q8", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Напишете правилната форма на думата в скобите: Космическите (станция) се използват за изучаване на последствията върху човешкото тяло от продължителния полет.", "correctAnswerText": "станции" },
            { "id": "22q9", "category": "spelling", "type": "open_ended", "isMultiplayer": true, "question": "Запишете правилно САМО думата, в която е допусната правописна грешка: Цъфтежът на японските вишневи дървета започва през месец Януари.", "correctAnswerText": "януари" },
            { "id": "22q10", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Напишете правилната форма на думата в скобите: Наградиха пожарникарите, (който) спасиха няколко души при бедствието.", "correctAnswerText": "които" },
            { "id": "22q11", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Запишете правилната форма САМО на думата, в която е допусната граматична грешка: Очакваме да изиграеме най-силното театрално представление за последните два сезона, защото разчитаме на няколко от най-добрите ни артисти.", "correctAnswerText": "изиграем" },
            { "id": "22q12", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Запишете САМО думата, с която да поправите граматичната грешка в изречението: Наградиха момчето, защото той се класира на първо място в състезанието.", "correctAnswerText": "то" },
            { "id": "22q13", "category": "punctuation", "type": "open_ended", "isMultiplayer": false, "question": "Препишете текста, като поставите 5 липсващи препинателни знака: Сава Огнянов е първородният син на Мина Горанова, на която Ботев посвещава творбата си Пристанала. Но за да я откъсне от поета баща ѝ я праща в Прага да учи пеене, а след това я омъжва за котленеца Петър Огнянов. По-късно Ботев споделя че е имал любима породила у него страстна любов угаснала тъй рано.", "correctAnswerText": "Сава Огнянов е първородният син на Мина Горанова, на която Ботев посвещава творбата си „Пристанала“. Но за да я откъсне от поета, баща ѝ я праща в Прага да учи пеене, а след това я омъжва за котленеца Петър Огнянов. По-късно Ботев споделя, че е имал любима, породила у него страстна любов, угаснала тъй рано." }
          ]
        },
        {
          "sectionId": "part_2_reading_comprehension",
          "title": "Четене с разбиране",
          "groups": [
            {
              "groupId": "reading_revolutions",
              "passage": "ТЕКСТ 1\nБащите на Френската революция издигат като основни принципи в междуличностните и обществените отношения свободата, братството и равенството. Заедно тези три думи звучат красиво като идеал. Но на практика са несъвместими принципи – ако има свобода, няма равенство. Ако ли пък има равенство, няма свобода, защото със сила се налага равенството. А когато нещо е наложено със сила, за какво братство може да се говори? Идеологически обаче тези три думи вършат прекрасна работа и до днес. Впрочем още тогава, само четири години след щурма на Бастилията, това триединство е потъпкано по време на якобинската диктатура начело с Максимилиан Робеспиер и терора на якобинците, довел до гибелта на 30 хиляди души чрез гилотиниране. Самият Робеспиер – един от бащите на революцията, на свой ред също намира края си на гилотината и така се ражда прозрението, че „революцията изяжда децата си“.\nФренската революция е дала своя значим принос за днешната демокрация. За пръв път в Европа биват обявени за неприкосновени гражданските и човешките права чрез Декларацията за правата на човека и гражданина. За пръв път се изработва и приема демократичен основен закон, или конституция, която пък предписва като основен принцип разделението на властите – законодателна, изпълнителна и съдебна. Полага се и началото на многопартийната система. Изключителен акт е и отделянето на църковната от светската власт – нещо немислимо дотогава. Новости има и в областта на правото – приема се Френският граждански кодекс, или т.нар. Наполеонов кодекс, който има огромно въздействие върху гражданското право и до днес.\n\nТЕКСТ 2\nНа едни им е додеяло от революции, други се чувстват окрилени от революционния кипеж. Революциите са двуостър меч. Те не оставят място за неутралитет – едни са окрилени, на други крилата са подрязани. Революциите винаги дават неизпълними обещания. Били сме щели да бъдем свободни, били сме щели да станем като нормалните държави – да пътуваме, да търгуваме, да печелим, да забогатяваме, да пишем и да говорим каквото си искаме, несправедливостите да се махнат, законността да се възцари. И още, и още… Стига толкова, стига! Едни са измамени, други са спечелили, трети са спечелили много. Преживяхме много революции, но свободни не стан        {
          "sectionId": "part_3_literature",
          "title": "Литература",
          "standaloneQuestions": [
            { "id": "22q22", "category": "vocabulary", "type": "open_ended", "isMultiplayer": true, "question": "В листа за отговори запишете САМО паронима, с който да поправите лексикалната грешка: Ваниловата есенция предава много приятен аромат на този иначе обикновен десерт.", "correctAnswerText": "придава" },
            { 
              "id": "22q23", 
              "category": "vocabulary", 
              "type": "multiple_choice", 
              "isMultiplayer": true, 
              "question": "Изберете УМЕСТНАТА ДУМА за местата (А), (Б) и (В) в текста за учителите и екскурзоводите.", 
              "context": "Между професиите на учителя и на екскурзовода съществуват известни (А) ......... . И двамата трябва да умеят да (Б) ......... своята аудитория, така че тя да (В) ......... поднесената информация като лично преживяване.",
              "options": ["А) сходства, Б) предразположи, В) изживеят", "А) сходства, Б) предразположи, В) изживеят", "А) сходства, Б) предразположи, В) изживеят"], 
              "correctAnswer": 0 
            },
            { "id": "22q24", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кой от мотивите е интерпретиран в „Потомка“?", "options": ["А) за героичната саможертва", "Б) за свободата на човешкия дух", "В) за изневярата като непростим грех", "Г) за значимостта на материалните ценности"], "correctAnswer": 1 },
            { "id": "22q25", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кой от мотивите е интерпретиран в посочените откъси от „Молитва“ и „Сняг“ на А. Далчев?", "context": "Да усещам своя радостта / на невинното дете... и Бял сняг ще има само във градините, / където са играели деца.", "options": ["А) за детското страдание във враждебния град", "Б) за студенината и неприветливостта на света", "В) за неразбирането на децата от възрастните", "Г) за детската непосредственост и чистота"], "correctAnswer": 3 },
            { "id": "22q26", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Заглавието „Ноев ковчег“ в контекста на творбата препраща към:", "options": ["А) фолклорното начало в сюжета на творбата", "Б) смъртта на библейски старозаветен герой", "В) съхраняването и пренасянето of ценното в живота", "Г) божия гняв, довел до построяване на Ноевия ковчег"], "correctAnswer": 2 },
            { "id": "22q27", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Каква е ролята на епиграфа към Първа част на „Железният светилник“?", "context": "Овде дърво столовито... гранки му са мили снаи, а корени – синовите...", "options": ["А) Насочва към интерпретиране на социална проблематика.", "Б) Загатва значимостта на родовия свят в творбата.", "В) Внушава принадлежност към свят на индивидуалности.", "Г) Подсказва острия конфликт между човека и природата."], "correctAnswer": 1 },
            { "id": "22q28", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Каква е ролята на цитираното двустишие от „Новото гробище над Сливница“?", "context": "Но кой ви знай, че спите в тез полета? / Над ваший гроб забвеньето цъфти.", "options": ["А) Задава реторичен въпрос към виновниците за жестоката война.", "Б) Изразява идеята за духовното безсмъртие на героите.", "В) Въвежда мотива за забравата на героичната саможертва.", "Г) Откроява забравата на възрожденските идеали."], "correctAnswer": 2 },
            { "id": "22q29", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Коя тема е интерпретирана в откъса от стихотворението „Размисъл“ на Владимир Башев?", "context": "Ако няма какво да дадем на света, / за какво сме родени? ... Просто трябва / да имаме нежността...", "options": ["А) трудът и творчеството", "Б) животът и смъртта", "В) вярата и надеждата", "Г) изборът и раздвоението"], "correctAnswer": 0 },
            { "id": "22q30", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кое от твърденията е вярно?", "options": ["А) Както в „При Рилския манастир“, така и в „Градушка“ природата е благосклонна.", "Б) За разлика от „Градушка“ в „При Рилския манастир“ човекът преоткрива своята хармония с природата.", "В) За разлика от „При Рилския манастир“ в „Градушка“ човекът се възхищава от величието на природата.", "Г) Както в „Градушка“, така и в „При Рилския манастир“ Бог наказва човека чрез природата."], "correctAnswer": 1 },
            { "id": "22q31", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кое от тълкуванията съответства на смисъла на откъса от „Песента на колелетата“?", "context": "Работите му отиваха добре... Идеха му неподозирани и от него самия сили... от неговите ръце излизаха каруци, които бяха същинско чудо…", "options": ["А) Представена е отговорността на героя пред семейството.", "Б) Утвърден е стремежът към забогатяване като цел.", "В) Загатнат е драматичният конфликт между външния и вътрешния свят.", "Г) Осмислен е трудът като израз на духовната щедрост на човека."], "correctAnswer": 3 },
            { "id": "22q32", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кое от твърденията е вярно?", "options": ["А) Както в „До моето първо либе“, така и в „Крадецът на праскови“ смъртта е представена като жадуван край.", "Б) Както в „До моето първо либе“, така и в „Крадецът на праскови“ животът на героите е подчинен на традиционните норми.", "В) За разлика от „До моето първо либе“ в „Крадецът на праскови“ любовта не поставя героите пред избор.", "Г) Както в „Крадецът на праскови“, така и в „До моето първо либе“ смъртта не е обвързана с мотива за саможертвата."], "correctAnswer": 0 },
            { "id": "22q33", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "В коя творба трудът НЕ е интерпретиран като творческа дейност?", "options": ["А) „Песента на колелетата“", "Б) „Балада за Георг Хених“", "В) „Ветрената мелница“", "Г) „Градушка“"], "correctAnswer": 3 },
�виняват за своя провал успелите. А причината за провала, независимо дали обществен, или личен, е винаги вътре. Дори когато един организъм се заразява с вирус отвън, причината пак е в него, в слабата му способност за защита. Защото други организми устояват на същия вирус. А провалените търсят кой ги е заразил, вместо да усилят защитата си. Да погледнат навътре, не могат. Поглеждането навътре би било за тях проглеждане, но те си остават слепи. После компенсират тази слепота с излишък от самочувствие и с геройско изтъкване. Сякаш другите народи нямат велики герои, бляскави победи и славна история. Сякаш само ние на света сме най-първи във всичко. Само дето всичката ни слава е все в миналото – далечно и близко, но с което ние сякаш сме скъсали генетичната си връзка и изглежда, че не сме го наследили реално. Потомци сме на лъвове, а постъпваме като мишки.\nИз „Есе за революциите“, Т. Димова (адаптиран откъс)",
              "questions": [
                { "id": "22q14", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Защо според Текст 1 принципите на Френската революция – свободата, братството и равенството, „на практика са несъвместими“ помежду си?", "options": ["А) Защото с прилагането им на практика неизбежно се стига до диктатура.", "Б) Защото спазването на един от принципите води до нарушаването на друг.", "В) Защото са издигнати с цел революцията да събере повече поддръжници.", "Г) Защото бащите на революцията ги провъзгласяват, за да станат известни."], "correctAnswer": 1 },
                { "id": "22q15", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Кое от посочените събития в Текст 1 се определя като „изключителен акт“?", "options": ["А) приемането на Френския граждански кодекс", "Б) отделянето на църквата от светската власт", "В) изработването на демократична конституция", "Г) обявяването на гражданските и човешките права"], "correctAnswer": 1 },
                { "id": "22q16", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Според Текст 2 причината за провала на един народ е:", "options": ["А) в липсата на велики герои и на славна история", "Б) в неспособността му да се защити от външни врагове", "В) в нежеланието му да се поучи от опита на успелите", "Г) в невъзможността му да потърси причините вътре в себе си"], "correctAnswer": 3 },
                { "id": "22q17", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Кое твърдение НЕ се споделя от автора на Текст 2?", "options": ["А) Свободата не се постига задължително чрез революция.", "Б) Революциите винаги дават неизпълними обещания.", "В) Революциите винаги водят до извоюване на свобода.", "Г) Революциите не оставят място за неутралитет."], "correctAnswer": 2 },
                { "id": "22q18", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете израза от Текст 1, с който се обяснява защо революцията погубва своите създатели.", "correctAnswerText": "революцията изяжда децата си" },
                { "id": "22q19", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ЕДИН аргумент от Текст 1 в подкрепа на твърдението, че Френската революция има принос за съвременната демокрация.", "correctAnswerText": "обявени са за неприкосновени гражданските и човешките права / приема се демократичен основен закон (конституция) / разделение на властите / многопартийна система / отделяне на църквата от държавата" },
                { "id": "22q20", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ЕДИН аргумент от Текст 2 в подкрепа на твърдението, че българите не са станали свободни въпреки многото революции.", "correctAnswerText": "скъсали сме генетичната си връзка със славното минало / не сме наследили реално славното минало / потомци сме на лъвове, а постъпваме като мишки" },
                { "id": "22q21", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "В текст до 5 изречения коментирайте прозрението на автора на Текст 2, че „революциите са двуостър меч“.", "correctAnswerText": "Свободен отговор (оценява се аргументация)." }
              ]
            }
          ]
        },
        {
          "sectionId": "part_3_literature",
          "title": "Литература",
          "standaloneQuestions": [
�рво либе“ смъртта е представена като жадуван край.", "Б) Както в „До моето първо либе“, така и в „Крадецът на праскови“ животът на героите е подчинен на традиционните норми.", "В) За разлика от „До моето първо либе“ в „Крадецът на праскови“ любовта не поставя героите пред избор.", "Г) Както в „Крадецът на праскови“, така и в „До моето първо либе“ смъртта не е обвързана с мотива за саможертвата."], "correctAnswer": 0 },
            { "id": "22q33", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "В коя творба трудът НЕ е интерпретиран като творческа дейност?", "options": ["А) „Песента на колелетата“", "Б) „Балада за Георг Хених“", "В) „Ветрената мелница“", "Г) „Градушка“"], "correctAnswer": 3 },
            { "id": "22q34", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "В кои две творби родното се утвърждава като ценност?", "options": ["А) „Спи езерото“ и „До моето първо либе“", "Б) „Железният светилник“ и „Паисий“", "В) „Две души“ и „Балкански синдром“", "Г) „Спасова могила“ и „Потомка“"], "correctAnswer": 1 },
            { "id": "22q35", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Съпоставете интерпретациите на темата за вярата в „Спасова могила“ и във „Вяра“ и запишете ЕДНА разлика между тях.", "correctAnswerText": "В „Спасова могила“ вярата е в чудото/Бога, а във „Вяра“ – в живота/човека." },
            { "id": "22q36", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Разтълкувайте значението на епиграфа към „Приказка за стълбата“ за смисъла на творбата: Посветено на всички, които ще кажат: „Това не се отнася до мене!“.", "correctAnswerText": "Отправя се предупреждение към всички, че изкушението на властта е универсално." },
            { "id": "22q37", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ЕДНО значение на природното описание в „Андрешко“ за изграждане на смисъла на творбата.", "context": "По небето тежко и бавно лазеха... дебели, дрипави, влажни и мрачни зимни облаци... Земята тънеше в кал и влага.", "correctAnswerText": "Природното описание се свързва с мрачната и неприветлива социална действителност." },
            { "id": "22q38", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ЕДНА характерна за жанра на одата черта, проявена в „Паисий“.", "correctAnswerText": "Възторгът от делото на Паисий / възхвалата на героя." },
            { 
              "id": "22q39", 
              "category": "literature", 
              "type": "matching", 
              "isMultiplayer": true, 
              "question": "Свържете заглавието с неговия автор:", 
              "matchingItems": {
                "left": ["А) Приказка за стълбата", "Б) Ноев ковчег", "В) Балкански синдром"],
                "right": ["1. Йордан Радичков", "2. Станислав Стратиев", "3. Христо Смирненски"]
              },
              "options": ["А) А-3, Б-1, В-2", "Б) А-1, Б-2, В-3", "В) А-2, Б-3, В-1", "Г) А-3, Б-2, В-1"], 
              "correctAnswer": 0, 
              "explanation": "А) Смирненски (3), Б) Радичков (1), В) Стратиев (2)" 
            },
            { 
              "id": "22q40", 
              "category": "literature", 
              "type": "essay", 
              "isMultiplayer": false, 
              "question": "В текст до 5 изречения съпоста�                { "id": "23q16", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Защо подчертаното изречение в Текст 2 завършва с многоточие?", "options": ["А) Защото певицата е наясно, че това рано или късно все ще се случи.", "Б) Защото певицата не иска да изрече на глас, че операта може да загине.", "В) Защото певицата си дава сметка, че операта никога няма да загине.", "Г) Защото певицата е убедена, че съвременната музика ще измести операта."], "correctAnswer": 1 },
                { "id": "23q17", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Кое противопоставяне НЕ присъства в нито един от двата текста?", "options": ["А) свят на технологиите – свят на изкуството", "Б) комерсиалност в изкуството – безкомпромисност в изкуството", "В) почитатели на поп музиката – почитатели на оперното изкуство", "Г) фолклорна музика – класическа музика"], "correctAnswer": 3 },
                { "id": "23q18", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете израза, чрез който в Текст 1 е означен разцветът на оперното изкуство сред композиторите.", "correctAnswerText": "истински бум / този жанр преживява истински бум" },
                { "id": "23q19", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ЕДИН аргумент от Текст 1 в подкрепа на твърдението, че и днес оперното изкуство има своя публика по цял свят.", "correctAnswerText": "Хората чакат с години, за да съпреживеят любими арии на някоя от световните оперни сцени." },
                { "id": "23q20", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ЕДИН аргумент от Текст 2 в подкрепа на твърдението, че оперното изкуство има бъдеще.", "correctAnswerText": "Човекът винаги ще има потребност от изкуството, а не само от компютъра и от цифрите." },
                { "id": "23q21", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "В текст до 5 изречения коментирайте връзката между съвременните технологии и изкуството.", "correctAnswerText": "Свободен отговор (оценява се аргументация)." }
 Планирам да започна работа като помощник-готвач още през лятната ваканция.", "В) Тази година картинната галерия ще отбележи своя 25-годишен юбилей с три изложби.", "Г) За любителите на класическата музика концерт ще изнесе световноизвестен пианист."], "correctAnswer": 0 },
            { "id": "23q4", "category": "grammar", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение НЕ е допусната граматична грешка?", "options": ["А) Трябва да имаме речева стратегия, когато започваме да говориме.", "Б) Най-посещаван на празници е манастира, разположен над града.", "В) Конкуренцията между българския и полския отбор е голяма.", "Г) Явиха се само двама кандидата за предложената позиция."], "correctAnswer": 2 },
            { "id": "23q5", "category": "grammar", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната граматична грешка?", "options": ["А) Новият и старият директор отправиха емоционални послания към служителите.", "Б) Следващите пет заглавия са на филми, чийто касов успех едва ли някога ще бъде надминат.", "В) От самото си създаване нашият екип работи с Държавна агенция за закрила на детето.", "Г) Уважаеми господин Петров, съжалявам, че толкова дълго сте чакали решението на комисията."], "correctAnswer": 2 },
            { "id": "23q6", "category": "punctuation", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната пунктуационна грешка?", "options": ["А) Подходящ за всеки сезон, този нов парфюм съчетава аромати на лайм, портокал и жасмин.", "Б) Нощното августовско небе, обсипано с безброй звезди, се разстилаше пред погледа му.", "В) Филмът на младия български режисьор ми хареса и като концепция, и като реализация.", "Г) В днешното предаване скъпи слушатели, ще разговаряме за опазването на тревните площи."], "correctAnswer": 3 },
            { "id": "23q7", "category": "punctuation", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната пунктуационна грешка?", "options": ["А) Това е човекът, на когото мога да доверя всичките си тайни и който винаги ми е помагал в живота.", "Б) Учените все още не знаят със сигурност защо хората сънуват и дали сънищата имат връзка с преживяното.", "В) Странно е поведението на онези, които, за да бъдат харесвани от всички са безкритични.", "Г) Едва ли има родител, който да не иска да зарадва детето си, като му отделя повече време."], "correctAnswer": 2 },
            { "id": "23q8", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Напишете правилната форма на думата в скобите: В статията си психологът обяснява разликата между злорадството и (завист).", "correctAnswerText": "завистта" },
            { "id": "23q9", "category": "spelling", "type": "open_ended", "isMultiplayer": true, "question": "Запишете правилно САМО думата, в която е допусната правописна грешка: През есенните месеци зачестяват случаите на ожилване от пчели.", "correctAnswerText": "ужилване" },
            { "id": "23q10", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Напишете правилната форма на думата в скобите: Трябва да се определят двамата (участник), които да представят стратегията си пред журито.", "correctAnswerText": "участници" },
            { "id": "23q11", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Запишете САМО правилната форма на думата, в която е допусната граматична грешка: Чаят от корените на растението укрепва имунната и дихателната системи.", "correctAnswerText": "система" },
            { "id": "23q12", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Запишете САМО думата, с която да поправите граматичната грешка: Всички окуражаваха момичето, защото искаха точно тя да победи в състезанието.", "correctAnswerText": "то" },
            { "id": "23q13", "category": "punctuation", "type": "open_ended", "isMultiplayer": false, "question": "Препишете текста, като поставите 5 липсващи препинателни знака: В света на медицината т.нар. „бабини рецепти“ обикновено се свързват със суеверие. Оказва се обаче че доста от тях представляват интерес за съвременната наука доказателство за което е и книгата Бабини деветини. Използвайки най-новите изследвания авторът ѝ проучва повече от петдесет народни суеверия за да помогне на читателя да се ориентира кое е истина и кое – измислица.", "correctAnswerText": "В света на медицината т.нар. „бабини рецепти“ обикновено се свързват със суеверие. Оказва се обаче, че доста от тях представляват интерес за съвременната наука, доказателство за което е и книгата „Бабини деветини“. Използвайки най-новите изследвания, авторът ѝ проучва повече от петдесет народни суеверия, за да помогне на читателя да се ориентира кое е истина и кое – измислица." }
          ]
        },
        {
          "sectionId": "part_2_reading_comprehension",
          "title": "Четене с разбиране",
          "groups": [
            {
              "groupId": "reading_opera",
              "passage": "ТЕКСТ 1\nАко попитаме един средностатистически млад човек, за когото културните удоволствия се свеждат най-вече до попконцертите и дискотеките, влизал ли е в оперна зала, той най-вероятно би ни се изсмял. Би обяснил, че смята операта за старомоден жанр, в който всичко е приповдигнато и преувеличено и в който „нормалната“ човешка реч е заменена с пеене. Как да си обясним тогава, че операта и през 21. век все още привлича публика от всички части на планетата? Любопитен е фактът, че след Втората световна война западният авангард изцяло отхвърля операта (както и класическата музика изобщо) като „буржоазно изкуство“, вследствие на което 30 години не се появява нито една опера. Но от края на миналия век и до днес този жанр преживява истински бум не само сред новите, но и сред по-старите поколения композитори.\nКакво кара хората да си купят билет за опера и търпеливо да чакат дори и няколко години, за да съпреживеят любимите си арии на някоя от световните оперни сцени? Или да се тълпят вечер преди самото представление пред касите – без значение колко висока е цената на билетите – с надеждата по щастлива случайност да си осигурят един билет? Операта не понася подражанието на действителността и дребнотемието. Действителността в нея е пречупена през вълшебно огледало или е погледната сякаш от друга планета. Затова всичко в операта изглежда преувеличено и приповдигнато, тъй като тя има свойството не толкова да извежда на преден план самия сюжет, колкото да създава неповторима атмосфера.\n\nТЕКСТ 2\n– Как гледате на опитите днес да се смесват оперни гласове с попмузика?\n– Аз съм твърде много музикант, за да приема такъв „търговски“ подход. Зная, че живеем в света на телевизията, на високите технологии. Аз не съм правила никога компромис, а подобно смесване на жанровете е компромис. Смятам, че влезе ли в друг жанр, оперният певец става смешен. Ние, оперните певци, имаме съвсем друга гласова постановка, най-важното – естетиката ни е друга. Нямаме вкус към „леката“ музика. Затова такива опити ми изглеждат доста абсурдни.\n– Смятате ли, че интернет поколението има това специфично музикално чувство, което е характерно за операта?\n– Аз самата не съм от това поколение. Наистина всичко се променя, но смятам, че културата трябва да се съхрани. Човекът има потребност от изкуството, а не само от компютъра и от цифрите. Ние, по-старите, трябва да предадем своя опит на младото поколение, да му внушим, че оперното изкуство възвисява духа. Не само компютрите правят живота.\n– Какво ще стане с операта през нашия век? Ще „мутира“ ли под влиянието на съвременните технологии, или ще остане островче на чисто човешкото?\n– Ако нашата цивилизация оживее, ще оживее и операта, ако загине... Но аз се надявам, че цивилизацията ни няма да загине. Питала съм се как ще повлияят технологиите на операта. Само преди месец чух един концерт със съвременна музика, в който всичко беше направено от компютри. И хорът беше направен от компютър. Машината няма дух, няма мозък, няма емоция, а човекът има чувства, има и душà. Затова операта винаги ще се прави от живи хора.",
              "questions": [
                { "id": "23q14", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Защо според Текст 1 всичко в операта изглежда приповдигнато и преувеличено?", "options": ["А) В операта отсъства „нормалната“ човешка реч и се набляга единствено на пеенето.", "Б) В операта на преден план се извежда самият сюжет, изпълнен с остри конфликти.", "В) Операта се въздържа от подражанието на действителността и от дребнотемието.", "Г) На операта отдавна не може да се гледа като на някакво културно удоволствие."], "correctAnswer": 2 },
                { "id": "23q15", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "В Текст 1 се защитава позицията, че:", "options": ["А) Операта си остава непреходно изкуство.", "Б) Цените на билетите за опера са прекалено скъпи.", "В) Оперното изкуство вече е отживелица.", "Г) Операта трябва да се отрече като „буржоазно изкуство“."], "correctAnswer": 0 },
                { "id": "23q16", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Защо подчертаното изречение в Текст 2 завършва с многоточие?", "options": ["А) Защото певицата е наясно, че това рано или късно все ще се случи.", "Б) Защото певицата не иска да изрече на глас, че операта може да загине.", "В) Защото певицата си дава сметка, че операта никога няма да загине.", "Г) Защото певицата е убедена, че съвременната музика ще измести операта."], "correctAnswer": 1 },
                { "id": "23q17", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Кое противопоставяне НЕ присъства в нито един от двата текста?", "options": ["А) свят на технологиите – свят на изкуството", "Б) комерсиалност в изкуството – безкомпромисност в изкуството", "В) почитатели на поп музиката – почитатели на оперното изкуство", "Г) фолклорна музика – класическа музика"], "correctAnswer": 3 },
                { "id": "23q18", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете израза, чрез който в Текст 1 е означен разцветът на оперното изкуство сред композиторите.", "correctAnswerText": "истински бум / този жанр преживява истински бум" },
                { "id": "23q19", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ЕДИН аргумент от Текст 1 in подкрепа на твърдението, че и днес оперното изкуство има своя публика по цял свят.", "correctAnswerText": "Хората чакат с години, за да съпреживеят любими арии на някоя от световните оперни сцени." },
                { "id": "23q20", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ЕДИН аргумент от Текст 2 in подкрепа на твърдението, че оперното изкуство има бъдеще.", "correctAnswerText": "Човекът винаги ще има потребност от изкуството, а не само от компютъра и от цифрите." },
                { "id": "23q21", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "В текст до 5 изречения коментирайте връзката между съвременните технологии и изкуството.", "correctAnswerText": "Свободен отговор (оценява се аргументация)." }
              "passage": "ТЕКСТ 1\nСпортните занимания са важен фактор за постигане на добро физическо и психическо здраве. Според данните на Световната здравна организация при хората, които спортуват поне 150 минути седмично, има значително по-нисък риск от хронични заболявания и преждевременна смърт.\n\nВъпреки това заниманията със спорт имат и своите предизвикателства. Много специалисти предупреждават, че неправилната техника на изпълнение на упражненията, прекомерното натоварване и омаловажаването на възстановителните периоди могат да доведат до сериозни травми. Скорошно изследване сочи, че около 30% от редовно спортуващите получават травми, които са резултат от липсата на загряване преди тренировка. Според експертите по спортна медицина съревнованието с другите спортуващи в залата често подтиква хората да надценяват възможностите си, което увеличава риска от дълготрайни увреждания.\n\nСъществуват и някои погрешни схващания около спортуването. Широко разпространено например е мнението, че тичането може да се практикува от всички. Ако човек обаче е с тегло дори и малко над нормата, рискът от травми е много по-голям. При бягане ставите на краката трябва да издържат на натоварване, което се равнява на утроеното собствено тегло. Друго разпространено схващане е, че разходката не е спорт. Данни от изследване обаче свидетелстват, че четири кратки разходки на ден са по-полезни от продължителен джогинг както за кръвообрaщението и работата на сърцето, така и за намаляването на високото кръвно налягане. Доказано е също така, че ако се изминават пеша кратки отсечки от по един километър, проблемите със съня намаляват наполовина.\n\nТанцуването пък се оказва, че е едно от най-ефективните и същевременно най-полезните за гърба спортни занимания. Гръбначните мускули се стабилизират, а тялото изгаря за час танцуване около 600 килокалории. Редовните занимания с танци намаляват със 76% риска от деменция, сочи изследване. Народните танци например не само укрепват здравето – те съхраняват и културната идентичност чрез връзката с фолклора и обичаите.\n\nНякои експерти смятат обаче, че спортуването е само една част от здравословния начин на живот. Според повечето диетолози правилното хранене и качественият сън са не по-малко важни. Физическата активност може да подобри здравето, но без балансиран хранителен режим и без достатъчно почивка усилията може да бъдат напразни.\n\nТЕКСТ 2 (ДИАГРАМА)\nДанни защо хората не спортуват:\n1. Няма къде: над 50г(60%), 31-50г(20%), 16-30г(20%).\n2. Няма пари: над 50г(65%), 31-50г(25%), 16-30г(10%).\n3. Страх от травми: над 50г(50%), 31-50г(30%), 16-30г(20%).\n4. Не ми харесва: над 50г(50%), 31-50г(40%), 16-30г(10%).\n5. Няма мотивация: над 50г(50%), 31-50г(20%), 16-30г(30%).\n6. Няма време: над 50г(5%), 31-50г(55%), 16-30г(40%).",
�енните технологии и изкуството.", "correctAnswerText": "Свободен отговор (оценява се аргументация)." }
              ]
            }
          ]
        },
        {
          "sectionId": "part_3_literature",
          "title": "Литература",
          "standaloneQuestions": [
            { "id": "23q22", "category": "literature", "type": "open_ended", "isMultiplayer": true, "question": "Запишете САМО паронима, с който да поправите лексикалната грешка: Ваниловата есенция предава много приятен аромат на този иначе обикновен десерт.", "correctAnswerText": "придава" },
            { 
              "id": "23q23", 
              "category": "literature", 
              "type": "multiple_choice", 
              "isMultiplayer": true, 
              "question": "Изберете УМЕСТНАТА ДУМА за местата (А), (Б) и (В) в текста за учителите и екскурзоводите.", 
              "context": "Между професиите на учителя и на екскурзовода съществуват известни (А) ......... . И двамата трябва да умеят да (Б) ......... своята аудитория, така че тя да (В) ......... поднесената информация като лично преживяване.",
              "options": ["А) сходства, Б) предразположи, В) изживеят", "А) недостатъци, Б) наставлява, В) доживеят", "А) преимущества, Б) регистрира, В) надживеят"], 
              "correctAnswer": 0 
            },
            { "id": "23q24", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кой от мотивите е интерпретиран в „Потомка“?", "options": ["А) за героичната саможертва", "Б) за свободата на човешкия дух", "В) за изневярата като непростим грях", "Г) за значимостта на материалните ценности"], "correctAnswer": 1 },
            { "id": "23q25", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кой от мотивите е интерпретиран в посочените откъси от „Молитва“ и „Сняг“ на А. Далчев?", "context": "Да усещам своя радостта / на невинното дете... и Бял сняг ще има само във градините, / където са играели деца.", "options": ["А) за детското страдание във враждебния град", "Б) за студенината и неприветливостта на света", "В) за неразбирането на децата от възрастните", "Г) за детската непосредственост и чистота"], "correctAnswer": 3 },
            { "id": "23q26", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Заглавието „Ноев ковчег“ в контекста на творбата препраща към:", "options": ["А) фолклорното начало в сюжета на творбата", "Б) смъртта на библейски старозаветен герой", "В) съхраняването и пренасянето на ценното в живота", "Г) божия гняв, довел до построяване на Ноевия ковчег"], "correctAnswer": 2 },
            { "id": "23q27", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Каква е ролята на епиграфа към Първа част на „Железният светилник“?", "context": "Овде дърво столовито... гранки му са мили снаи, а корени – синовите...", "options": ["А) Насочва към интерпретиране на социална проблематика.", "Б) Загатва значимостта на родовия свят в творбата.", "В) Внушава принадлежност към свят на индивидуалности.", "Г) Подсказва острия конфликт между човека и природата."], "correctAnswer": 1 },
            { "id": "23q28", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Каква е ролята на цитираното двустишие от „Новото гробище над Сливница“?", "context": "Но кой ви знай, че спите в тез полета? / Над ваший гроб забвеньето цъфти.", "options": ["А) Задава реторичен въпрос към виновниците за жестоката война.", "Б) Изразява идеята за духовното безсмъртие на героите.", "В) Въвежда мотива за забравата на героичната саможертва.", "Г) Откроява забравата на възрожденските идеали."], "correctAnswer": 2 },
            { "id": "23q29", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Коя тема е интерпретирана в откъса от стихотворението „Размисъл“ на Владимир Башев?", "context": "Ако няма какво да дадем на света, / за какво сме родени? ... Просто трябва / да имаме нежността...", "options": ["А) трудът и творчеството", "Б) животът и смъртта", "В) вярата и надеждата", "Г) изборът и раздвоението"], "correctAnswer": 0 },
            { "id": "23q30", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кое от твърденията е вярно?", "options": ["А) Както в „При Рилския манастир“, така и в „Градушка“ природата е благосклонна.", "Б) За разлика от „Градушка“ в „При Рилския манастир“ човекът преоткрива своята хармония с природата.", "В) За разлика от „При Рилския манастир“ в „Градушка“ човекът се възхищава от величието на природата.", "Г) Както в „Градушка“, така и в „При Рилския манастир“ Бог наказва човека чрез природата."], "correctAnswer": 1 },
            { "id": "23q31", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кое от тълкуванията съответства на смисъла на откъса от „Песента на колелетата“?", "context": "Работите му отиваха добре... Идеха му неподозирани и от него самия сили... от неговите ръце излизаха каруци, които бяха същинско чудо…", "options": ["А) Представена е отговорността на героя пред семейството.", "Б) Утвърден е стремежът към забогатяване като цел.", "В) Загатнат е драматичният конфликт между външния и вътрешния свят.", "Г) Осмислен е трудът като израз на духовната щедрост на човека."], "correctAnswer": 3 },
            { "id": "23q32", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Природата като пейзаж на човешката душа присъства в:", "options": ["А) „Колко си хубава!“", "Б) „Градушка“", "В) „Спи езерото“", "Г) „До моето първо либе“"], "correctAnswer": 2 },
            { "id": "23q33", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Образът на смъртта е ключов за смисловите внушения на:", "options": ["А) „Спи езерото“", "Б) „При Рилския манастир“", "В) „До моето първо либе“", "Г) „Колко си хубава!“"], "correctAnswer": 2 },
            { "id": "23q34", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кои две творби представят историята чрез образа на нейните безименни творци?", "options": ["А) „Железният светилник“ и „Ноев ковчег“", "Б) „Бай Ганьо журналист“ и „История“", "В) „Потомка“ и „Новото гробище над Сливница“", "Г) „Новото гробище над Сливница“ и „История“"], "correctAnswer": 3 },
            { "id": "23q35", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Съпоставете интерпретациите на темата за родното в „Бай Ганьо журналист“ и в „Балкански синдром“ и запишете ЕДНА прилика.", "correctAnswerText": "И в двете творби родното е представено като свят на преобърнати нравствени ценности." },
            { "id": "23q36", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Запишете каква представа за властта се постига чрез речта на съдия-изпълнителя в откъса от „Андрешко“.", "correctAnswerText": "Властта е безчувствена/жестока/тиранична/репресивна." },
            { "id": "23q37", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Разтълкувайте заглавието „Колко си хубава!“ в контекста на творбата.", "correctAnswerText": "Заглавието се свързва с възхищението/възторга от женската красота / от красотата на любимата." },
            { "id": "23q38", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ЕДНО значение на повторението „Сега съм у дома“ в „При Рилския манастир“.", "correctAnswerText": "Подсилва внушението за съкровена взаимовръзка / за постигната хармония между човека и природата." },
            { 
              "id": "23q39", 
              "category": "literature", 
              "type": "matching", 
              "isMultiplayer": true, 
              "question": "Свържете заглавието с неговия автор:", 
              "matchingItems": {
                "left": ["А) Борба", "Б) Потомка", "В) Посвещение"],
                "right": ["1. Елисавета Багряна", "2. Петя Дубарова", "3. Христо Ботев"]
              },
              "options": ["А) А-3, Б-1, В-2", "Б) А-1, Б-2, В-3", "В) А-2, Б-3, В-1", "Г) А-3, Б-2, В-1"], 
              "correctAnswer": 0, 
              "explanation": "А) Ботев (3), Б) Багряна (1), В) Дубарова (2)" 
            },
            { "id": "23q40", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "В текст до 5 изречения обяснете ролята на метафората в цитата „Аз не живея: аз горя“ от „Две души“ на Пейо Яворов.", "correctAnswerText": "Свободен отговор (оценява се анализ)." }
          ]
        },
        {
          "sectionId": "part_4_writing",
          "title": "Есе и ЛИС",
          "groups": [
            {
              "groupId": "writing_2023_august",
              "passage": "Изберете ЕДНА от двете теми и напишете текст.",
              "questions": [
                { 
                  "id": "23q41", 
                  "category": "writing", 
                  "type": "essay", 
                  "isMultiplayer": false, 
                  "question": "ТЕМА 1 (ЛИС): „Геройство и памет“ върху „Новото гробище над Сливница“ ИЛИ ТЕМА 2 (ЕСЕ): „Милосърдието – мяра за човешката сила“" 
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "testId": "matura_12_2025_FULL",
      "grade": 12,
      "sections": [
        {
          "sectionId": "part_1_grammar_spelling",
          "title": "Граматика и правопис",
          "standaloneQuestions": [
            { "id": "q1", "category": "spelling", "type": "multiple_choice", "isMultiplayer": true, "question": "В кой ред думата е изписана правилно?", "options": ["А) вариянт", "Б) уредник", "В) съвременици", "Г) потчертавам"], "correctAnswer": 1 },
            { "id": "q2", "category": "spelling", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната правописна грешка?", "options": ["А) Победителят взе преднина във финалния етап на състезанието.", "Б) Изследователят има публикации в авторитетни научни списания.", "В) Алпинистът трябва да е издържлив и физически, и психически.", "Г) По учебен план дисциплината се изучава през последния семестър."], "correctAnswer": 2 },
            { "id": "q3", "category": "spelling", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната правописна грешка?", "options": ["А) Върху кръгла масичка беше поставена бледозелена стъклена ваза с цветя.", "Б) Открита е изложба с картини на известен белгийски художник-експресионист.", "В) Приятелят ми започна работа като звукорежисьор в един столичен театър.", "Г) В центъра на града е издигнат 30-метров паметник на великия композитор."], "correctAnswer": 1 },
            { "id": "q4", "category": "grammar", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение НЕ е допусната граматична грешка?", "options": ["А) След премиерата актрисата благодари на своите почитатели.", "Б) Във фестивала участваха десет танцови състави от цялата страна.", "В) Пълният текст на доклада ще публикуваме скоро на нашия сайт.", "Г) Спектакълът зарадва ценителите на балетното и оперно изкуство."], "correctAnswer": 0 },
            { "id": "q5", "category": "grammar", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната граматична грешка?", "options": ["А) Лекторът обясни някои разлики между фолклорната и авторската приказка.", "Б) Туристите се настаниха в апартамент, чийто прозорци гледаха към площада.", "В) Управителят на Българската народна банка благодари за получената награда.", "Г) Господин Иванов, радваме се, че лично сте подкрепили нашата инициатива."], "correctAnswer": 1 },
            { "id": "q6", "category": "punctuation", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната пунктуационна грешка?", "options": ["А) Цветовата гама от жълти, сини и зелени тонове, се допълва с бяло и виолетово.", "Б) Януарският сняг направи непроходим единствения път, водещ към малкото село.", "В) Уважаеми господин Пантелеев, най-сърдечно Ви поздравяваме с Вашия юбилей!", "Г) Необходимо е декларацията да се подпише или от бащата, или от майката на ученика."], "correctAnswer": 0 },
            { "id": "q7", "category": "punctuation", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение НЕ е допусната пунктуационна грешка?", "options": ["А) Гората, през която вървяха, беше гъста и слънчевите лъчи ту се промъкваха...", "Б) Въпреки, че беше късно, двамата продължиха разговора, припомняйки си весели...", "В) Истинският приятел знае как да те успокои, когато си притеснен и винаги...", "Г) Младият мъж е работил, като журналист и филмов критик, преди да стане известен..."], "correctAnswer": 0 },
            { "id": "q8", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Напишете правилната форма на думата в скобите: Туристите се наслаждаваха на (свежест) на планинския въздух.", "correctAnswerText": "свежестта" },
            { "id": "q9", "category": "spelling", "type": "open_ended", "isMultiplayer": true, "question": "Извлечете и напишете правилно думата с правописна грешка: 'По време на възраждането се оформя новобългарският книжовен език.'", "correctAnswerText": "Възраждането" },
            { "id": "q10", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Напишете правилната форма на думата в скобите: '...липсва информация от кой офис е бил закупен (билет) Ви за полета до Рим.'", "correctAnswerText": "билетът" },
            { "id": "q11", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Извлечете и поправете грешната дума: 'Водещият сам преценява кой да покани за интервю в своето предаване.'", "correctAnswerText": "кого" },
            { "id": "q12", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Напишете правилната форма на думата в скобите: '...външно оперение (пазя) пингвините от вятъра...'", "correctAnswerText": "пазят" },
            { "id": "q13", "category": "punctuation", "type": "open_ended", "isMultiplayer": false, "question": "Препишете текста, като поставите 5 липсващи препинателни знака: Романът Граф Монте Кристо е истинско литературно приключение което пленява читателя от първата до последната страница. Историята, изпълнена с интриги, предателства и стремеж към възмездие разгръща сложни човешки съдби. Стилът на Александър Дюма е богат и увлекателен а умението му да съчетава напрежение и емоции прави романа незабравим.", "correctAnswerText": "Романът „Граф Монте Кристо“ е истинско литературно приключение, което пленява читателя от първата до последната страница. Историята, изпълнена с интриги, предателства и стремеж към възмездие, разгръща сложни човешки съдби. Стилът на Александър Дюма е богат и увлекателен, а умението му да съчетава напрежение и емоции, прави романа незабравим." },
            { "id": "q22", "category": "vocabulary", "type": "open_ended", "isMultiplayer": true, "question": "Напишете правилния пароним, за да поправите грешката: 'Той е човек, който твърдо устоява своите житейски принципи.'", "correctAnswerText": "отстоява" },
            { 
              "id": "q23", 
              "category": "vocabulary", 
              "type": "multiple_choice_cloze", 
              "isMultiplayer": true, 
              "question": "Изберете правилните думи за местата (А), (Б) и (В) в текста за Майстора.", 
              "context": "Владимир Димитров – Майстора черпи (А) ......... от природата и бита на българина. В своите картини той (Б) ......... красотата на родната земя, която е (В) ......... с цветове и светлина.",
              "options": ["А) вдъхновение, Б) разкрива, В) наситена", "А) съмнение, Б) покрива, В) преситена", "А) опит, Б) прикрива, В) засипана"], 
              "correctAnswer": 0 
            }
          ]
        },
        {
          "sectionId": "part_2_reading_comprehension",
          "title": "Четене с разбиране",
          "groups": [
            {
              "groupId": "reading_sport",
              "passage": "ТЕКСТ 1\nСпортните занимания са важен фактор за постигане на физическо здраве. Световната здравна организация препоръчва поне 150 минути умерена физическа активност седмично. Редовното движение намалява риска от хронични заболявания и подобрява настроението. Важно е обаче да се спазва правилна техника, за да се избегнат травми. Много хора погрешно смятат, че тичането е подходящо за всеки, но за някои по-щадящи са плуването или народните танци. Разходката също е вид спорт, ако се практикува редовно.\n\nТЕКСТ 2 (ДИАГРАМА)\nДанни защо хората не спортуват:\n1. Няма къде: над 50г(60%), 31-50г(20%), 16-30г(20%).\n2. Няма пари: над 50г(65%), 31-50г(25%), 16-30г(10%).\n3. Страх от травми: над 50г(50%), 31-50г(30%), 16-30г(20%).\n4. Не ми харесва: над 50г(50%), 31-50г(40%), 16-30г(10%).\n5. Няма мотивация: над 50г(50%), 31-50г(20%), 16-30г(30%).\n6. Няма време: над 50г(5%), 31-50г(55%), 16-30г(40%).",
              "questions": [
                { "id": "q14", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Кое е вярно за спортуването според Текст 1?", "options": ["А) 150 мин/седмично подобряват здравето", "Б) Спортуват за излекуване на хронични", "В) Травмите са изключени при редовни", "Г) Влияе само на физическото здраве"], "correctAnswer": 0 },
                { "id": "q15", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Кое НЕ е фактор за травми според Текст 1?", "options": ["А) пренебрегване на възстановяването", "Б) погрешна техника", "В) изминаване на 1км пеша", "Г) подценяване на загряването"], "correctAnswer": 2 },
                { "id": "q16", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Кое е вярното твърдение според Текст 2 (Диаграмата)?", "options": ["А) 16-30г не спортуват заради пари", "Б) Липсата на пари е най-честа при над 50г", "В) 31-50г най-рядко посочват свободното време", "Г) 16-30г посочват, че няма къде да спортуват"], "correctAnswer": 1 },
                { "id": "q17", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Какъв извод може да се направи от Текст 2?", "options": ["А) Над 50г посочват липса на места по-често от 16-30г", "Б) 31-50г не обичат спорта повече от над 50г", "В) 16-30г най-много се страхуват от нараняване", "Г) 31-50г без мотивация са 40%"], "correctAnswer": 0 },
                { "id": "q18", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Коя активност според Текст 1 се свързва с традициите?", "correctAnswerText": "народните танци" },
                { "id": "q19", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Коя възрастова група има най-малко проблем със свободното време?", "correctAnswerText": "над 50 години" },
                { "id": "q20", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ДВЕ заблуди за спорта според Текст 1.", "correctAnswerText": "1. Че тичането е за всички. 2. Че разходката не е спорт." },
                { "id": "q21", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Влезте в ролята на мотиватор (до 5 изречения за групата с най-голяма нужда от мотивация).", "correctAnswerText": "Индивидуален текст (оценява се логика)." }
              ]
            }
          ]
        },
        {
          "sectionId": "part_3_literature",
          "title": "Литература",
          "standaloneQuestions": [
            { "id": "q24", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кой конфликт е заложен в „Андрешко“?", "options": ["А) приятелство – предателство", "Б) живот – смърт", "В) замисъл – реализация", "Г) състрадание – безразличие"], "correctAnswer": 3 },
            { "id": "q25", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кой проблем е общ за откъсите от П. П. Славейков и Ив. Вазов?", "context": "Цитати: 'Сто двадесет души те бяха на брой...' и 'Българийо, за тебе те умряха...'", "options": ["А) за героичната саможертва в името на родината", "Б) за забравата на героите", "В) за безсмислието на смъртта", "Г) за страданието на майките"], "correctAnswer": 0 },
            { "id": "q26", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кой мотив НЕ присъства в „Бай Ганьо журналист“?", "options": ["А) словесна агресия", "Б) политическо нагаждачество", "В) превратности на съдбата", "Г) груб материализъм"], "correctAnswer": 2 },
            { "id": "q27", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Заглавието „Две души“ препраща към:", "options": ["А) двама влюбени", "Б) хармония", "В) сблъсък земно-небесно", "Г) вътрешен конфликт"], "correctAnswer": 3 },
            { "id": "q28", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "В кой цитат от „Градушка“ има страдалческо примирение?", "options": ["А) Град! – парчета...", "Б) Да бъде тъй неделя още...", "В) И всички емнали се боси...", "Г) Милост няма!"], "correctAnswer": 2 },
            { "id": "q29", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Коя тема е интерпретирана в откъса от „Дон Кихоте...“ на Д. Дамянов?", "options": ["А) труда", "Б) вярата", "В) смъртта", "Г) миналото"], "correctAnswer": 1 },
            { "id": "q30", "category": "literature", "type": "multiple_choice", "isMultiplayer": false, "question": "Кое за „Крадецът на праскови“ е НЕВЯРНО?", "options": ["А) Липата и колибата са контрастни", "Б) Огледалото буди вълнение у Елисавета", "В) Колибата е приютяващият дом", "Г) Липата е довереница"], "correctAnswer": 2 },
            { "id": "q31", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кое твърдение е вярно за „При Рилския манастир“ и „Спи езерото“?", "options": ["А) Природата носи хармония и мирен дух", "Б) Природата носи само тъга", "В) Описва се величествена красота", "Г) Асоциира се с чуждото"], "correctAnswer": 0 },
            { "id": "q32", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кое съответства на „Вяра“?", "options": ["А) конфликт човек-общество", "Б) вярата като условие за съществуване", "В) разочарование", "Г) саможертва за родината"], "correctAnswer": 1 },
            { "id": "q33", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Сляпо подчинение на властта присъства в:", "options": ["А) Андрешко", "Б) Потомка", "В) Борба", "Г) История"], "correctAnswer": 2 },
            { "id": "q34", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "В кои две творби любовта е преобразяваща сила?", "options": ["А) Вяра и Аз искам да те помня...", "Б) Колко си хубава и Честен кръст", "В) Посвещение и Крадецът на праскови", "Г) Две души и До моето първо либе"], "correctAnswer": 2 },
            { "id": "q35", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ЕДНА идея за времето в „Молитва“.", "correctAnswerText": "Времето е ограничено и изтича неумолимо." },
            { "id": "q36", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Връзката слово-памет в „Паисий“?", "correctAnswerText": "Чрез словото се съхранява паметта за миналото." },
            { "id": "q37", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Смисълът на завързаните ръце и зашитата уста в „Честен кръст“?", "correctAnswerText": "Решимост за отказ от поезията в името на верността към себе си." },
            { "id": "q38", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Значение на заглавието „Хаджи Серафимовата внука“?", "correctAnswerText": "Връзката с рода и патриархалния свят." },
            { 
              "id": "q39", 
              "category": "literature", 
              "type": "matching", 
              "isMultiplayer": true, 
              "question": "Свържете заглавието с неговия автор:", 
              "matchingItems": {
                "left": ["А) До моето първо либе", "Б) Новото гробище над Сливница", "В) Ветрената мелница"],
                "right": ["1. Вазов", "2. Елин Пелин", "3. Ботев"]
              },
              "options": ["А) А-3, Б-1, В-2", "Б) А-1, Б-2, В-3", "В) А-2, Б-3, В-1", "Г) А-3, Б-2, В-1"], 
              "correctAnswer": 0, 
              "explanation": "А) Ботев (3), Б) Вазов (1), В) Елин Пелин (2)" 
            },
            { "id": "q40", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Съпоставете темата за човека и историята в „История“ и „Отива си човек“.", "correctAnswerText": "Анализ на неизвестния човек в колелото на историята." }
          ]
        },
        {
          "sectionId": "part_4_writing",
          "title": "Есе и ЛИС",
          "groups": [
            {
              "groupId": "writing_topics",
              "passage": "Изберете ЕДНА от двете теми и напишете текст.",
              "questions": [
                { 
                  "id": "q41", 
                  "category": "writing", 
                  "type": "essay", 
                  "isMultiplayer": false, 
                  "question": "ТЕМА 1 (ЛИС): 'Разум и чувства' върху 'Крадецът на праскови' ИЛИ ТЕМА 2 (ЕСЕ): 'Животът – колело или стълба'" 
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "testId": "matura_12_2024_august_FULL",
      "grade": 12,
      "sections": [
        {
          "sectionId": "part_1_grammar_spelling",
          "title": "Граматика и правопис",
          "standaloneQuestions": [
            { "id": "q1", "category": "spelling", "type": "multiple_choice", "isMultiplayer": true, "question": "В кой ред думата е изписана правилно?", "options": ["А) азиатски", "Б) овеличение", "В) съчуствие", "Г) распечатка"], "correctAnswer": 0 },
            { "id": "q2", "category": "spelling", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната правописна грешка?", "options": ["А) Очаква се скоро да оповестят резултатите от последните изследвания на Луната.", "Б) Часовникарят обеща на сестра ми много бързо да поправи старинния часовник.", "В) Само няколко вида безгръбначни оцеляват и при ниски минусови температури.", "Г) Тези два промишлени отрасла са гордост за страната и носят огромни приходи."], "correctAnswer": 3 },
            { "id": "q3", "category": "spelling", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение НЕ е допусната правописна грешка?", "options": ["А) Според своя произход еко системите се делят на естествени и изкуствени.", "Б) В момента учим за църковно-националните борби на българите през XIX в.", "В) През ваканцията заминаваме на десет дневна почивка на отдалечен остров.", "Г) Невинаги истината за събитията се представя обективно от историята."], "correctAnswer": 3 },
            { "id": "q4", "category": "grammar", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната граматична грешка?", "options": ["А) Няколкото бели лебеди, плуващи в езерото, привличаха погледите на минувачите.", "Б) Хотелът разполага с десет единични стаи за гости и с четири големи апартамента.", "В) Новия разказ на писателя можете да прочетете в мартенския брой на списанието.", "Г) Осигурени са средства за финансова подкрепа на малките и средните предприятия."], "correctAnswer": 2 },
            { "id": "q5", "category": "grammar", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение НЕ е допусната граматична грешка?", "options": ["А) През Възраждането светската и духовната власт търпят дълбоки промени.", "Б) Отборът по математика за пореден път заслужено завоюваха златни медали.", "В) Бяха се преместили наскоро и все още не познаваха никой в новия квартал.", "Г) Господин Иванов, разбрах, че Вие сам сте решил да се откажете от проекта."], "correctAnswer": 0 },
            { "id": "q6", "category": "punctuation", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната пунктуационна грешка?", "options": ["А) Броят на клиентите, търсещи дигитални услуги и системи за сигурност, постоянно расте.", "Б) Всички собственици на земеделски имоти, трябва да спазват посочените нормативни изисквания.", "В) Седнал на брега, той гледаше ту лодките в морето, ту летящите в небето чайки.", "Г) В центъра на светилището се намира голяма гранитна плоча с издълбани в нея надписи."], "correctAnswer": 1 },
            { "id": "q7", "category": "punctuation", "type": "multiple_choice", "isMultiplayer": true, "question": "В кое изречение е допусната пунктуационна грешка?", "options": ["А) Комисията ще разгледа офертите на фирмите, подали документи за участие в конкурса...", "Б) Азбучна истина е, че можем да постигнем целта си с добре обмислен план като го...", "В) След като обсъдихме въпроса, се оказа, че може да се включим и ние в проекта...", "Г) Потребителите ще имат възможност да ползват голямо намаление, при условие че..."], "correctAnswer": 1 },
            { "id": "q8", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Напишете правилната форма на думата в скобите: Замислих се за всички (преодолян) изпитания и усетих гордост.", "correctAnswerText": "преодолени" },
            { "id": "q9", "category": "spelling", "type": "open_ended", "isMultiplayer": true, "question": "Извлечете и напишете правилно думата с правописна грешка: 'Стадионът е с подържан терен и с нови пластмасови седалки.'", "correctAnswerText": "поддържан" },
            { "id": "q10", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Напишете правилната форма на думата в скобите: 'От едната страна на хълма имаше опасни (сипей).'", "correctAnswerText": "сипеи" },
            { "id": "q11", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Извлечете и поправете грешната дума (местоимение): 'Отличиха сина ми в конкурса, но той пропусна церемонията, на която трябваше да получи своята награда.'", "correctAnswerText": "своята" },
            { "id": "q12", "category": "grammar", "type": "open_ended", "isMultiplayer": true, "question": "Напишете правилната форма на думата в скобите: 'Господине, Вие вече сте (подал) всички документи...'", "correctAnswerText": "подали" },
            { "id": "q13", "category": "punctuation", "type": "open_ended", "isMultiplayer": false, "question": "Препишете текста, като поставите 5 липсващи препинателни знака: Ако се занимавате с дигитален маркетинг преди да напишете свой текст, помислете към кого точно отправяте посланието си. Иван Петров, експерт с дългогодишен опит в тази област съветва Подбирайте думи, които ще породят емоции у читателя без да изпадате в многословие.", "correctAnswerText": "Ако се занимавате с дигитален маркетинг, преди да напишете свой текст, помислете към кого точно отправяте посланието си. Иван Петров, експерт с дългогодишен опит в тази област, съветва: „Подбирайте думи, които ще породят емоции у читателя, без да изпадате в многословие.“" },
            { "id": "q22", "category": "vocabulary", "type": "open_ended", "isMultiplayer": true, "question": "Напишете правилния пароним, за да поправите грешката: 'Той се залепи на прозореца, наддаде ухо, но нищо не можа да чуе.'", "correctAnswerText": "нададе" },
            { 
              "id": "q23", 
              "category": "vocabulary", 
              "type": "multiple_choice_cloze", 
              "isMultiplayer": true, 
              "question": "Изберете правилните думи за местата (А), (Б) и (В) в текста за флористите.", 
              "context": "Флористите създават цветни (А) ......... , които са истинска (Б) ......... от багри и аромати. Тяхната работа изисква (В) ......... на определени правила за съчетаване на растенията.",
              "options": ["А) аранжименти, Б) композиция, В) спазването", "А) акомпанименти, Б) комуникация, В) предпазването", "А) аранжировки, Б) констатация, В) опазването"], 
              "correctAnswer": 0 
            }
          ]
        },
        {
          "sectionId": "part_2_reading_comprehension",
          "title": "Четене с разбиране",
          "groups": [
            {
              "groupId": "reading_climate",
              "passage": "ТЕКСТ 1\nДоказателствата, че климатът на планетата се променя, вече са очевидни. Ледниците в Аляска и Швейцария се топят с безпрецедентна скорост. Тибетското плато, често наричано „трети полюс“, също губи ледената си покривка. Учените предупреждават, че ако тенденцията продължи, някои крайбрежни мегаполиси могат да се окажат под вода. Въпреки това много хора продължават да подценяват сериозността на проблема и не са готови да променят навиците си в ежедневието.\n\nТЕКСТ 2 (ДИАГРАМА)\n'Какво бихте предприели в ежедневието си?':\n1. Пътуване по-малко със самолет: Съгласен(25%), Не съгласен(70%), Не мога да преценя(5%).\n2. Пътуване по-малко с автомобил: Съгласен(30%), Не съгласен(65%), Не мога да преценя(5%).\n3. Пестене на вода: Съгласен(50%), Не съгласен(40%), Не мога да преценя(10%).\n4. Енергоефективни уреди: Съгласен(30%), Не съгласен(60%), Не мога да преценя(10%).\n5. По-малко пластмасови опаковки: Съгласен(50%), Не съгласен(35%), Не мога да преценя(15%).\n6. Местни и сезонни продукти: Съгласен(62%), Не съгласен(30%), Не мога да преценя(8%).\n7. Разделно изхвърляне на отпадъци: Съгласен(75%), Не съгласен(20%), Не мога да преценя(5%).",
              "questions": [
                { "id": "q14", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Къде според Текст 1 промяната на температурата е най-значителна?", "options": ["А) в Швейцария", "Б) в Тибет", "В) в Аляска", "Г) в Африка"], "correctAnswer": 2 },
                { "id": "q15", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Според Текст 1 хората:", "options": ["А) се вълнуват от промените в световен план", "Б) продължават да подценяват промените", "В) тревожат се за потъването на държави", "Г) успокояват се, че не е равномерно"], "correctAnswer": 1 },
                { "id": "q16", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Какъв извод може да се направи от Текст 1 и Текст 2?", "options": ["А) Съществуват решения за намаляване на въздействието", "Б) Всички са готови да променят начина си на живот", "В) Единствено учените могат да решат проблема", "Г) Хората осъзнават своята безпомощност"], "correctAnswer": 0 },
                { "id": "q17", "category": "reading", "type": "multiple_choice", "isMultiplayer": false, "question": "Кое твърдение е вярно според Текст 2?", "options": ["А) Еднакъв дял за самолет и автомобил", "Б) Еднакъв дял за пестене на вода и пластмасови опаковки (50%)", "В) Еднакъв дял за уреди и сезонни продукти", "Г) Еднакъв дял за отпадъци и самолет"], "correctAnswer": 1 },
                { "id": "q18", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете израза, чрез който в Текст 1 е означено Тибетското плато.", "correctAnswerText": "трети полюс" },
                { "id": "q19", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Какво са готови в най-висока степен да предприемат хората според Текст 2?", "correctAnswerText": "да изхвърлят отпадъците си разделно" },
                { "id": "q20", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ЕДИН пример за това, че глобалното затопляне застрашава живота според Текст 1.", "correctAnswerText": "могат да потънат някои световни мегаполиси по крайбрежията" },
                { "id": "q21", "category": "reading", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ДВА аргумента да убедите хората да пътуват по-малко с автомобил (на база 65% несъгласни).", "correctAnswerText": "Свободен отговор (аргументация)." }
              ]
            }
          ]
        },
        {
          "sectionId": "part_3_literature",
          "title": "Литература",
          "standaloneQuestions": [
            { "id": "q24", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кой проблем НЕ е заложен в „Балкански синдром“?", "options": ["А) размити граници истина-лъжа", "Б) разминаване думи-действия", "В) подмяна на ценностите", "Г) единение около обществени каузи"], "correctAnswer": 3 },
            { "id": "q25", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кой проблем е интерпретиран in откъсите от „Опълченците на Шипка“ и „Новото гробище над Сливница“?", "options": ["А) изкуството като мост", "Б) природата като пазител", "В) паметта за героичния подвиг", "Г) паметта като саможертва"], "correctAnswer": 3 },
            { "id": "q26", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кой мотив е интерпретиран в „Бай Ганьо журналист“?", "options": ["А) журналистиката като средство за облагодетелстване", "Б) извисяване на личността", "В) спасение от покварата", "Г) властта като стимул за развитие"], "correctAnswer": 0 },
            { "id": "q27", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кое твърдение за думите на Рафе Клинче от „Железният светилник“ е вярно?", "context": "„Птичките пеят, зреят гроздовете… Душата ми е в това дърво. (…) Виждаш ли, погледни! По това ще ни познават людете некога, ще ни знаят…“", "options": ["А) Насочват към вечните ценности на българската душевност.", "Б) Акцентират върху конфликта между творческата личност и родовия свят.", "В) Внушават идеята за постигане на безсмъртие чрез изкуството.", "Г) Подчертават мястото на любимата сред изображенията в иконостаса."], "correctAnswer": 2 },
            { "id": "q28", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Какво провокира повествователя у Радичков да построи своя Ноев ковчег?", "options": ["А) самочувствие на нов Ной", "Б) богоизбран водач", "В) съхраняване на паметта за многоликия живот", "Г) надежда за спасение от мизерията"], "correctAnswer": 2 },
            { "id": "q29", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кое е вярно за откъса от „Крадецът на праскови“ (фокус върху войната)?", "options": ["А) войната като обричаща на безчовечност", "Б) обречената любов на Елисавета", "В) отдалечеността на войната", "Г) вътрешния конфликт"], "correctAnswer": 0 },
            { "id": "q30", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Коя тема е интерпретирана в „Дъждовната есенна нощ“ на Ив. Пейчев?", "options": ["А) изборът", "Б) трудът", "В) обществото", "Г) миналото и паметта"], "correctAnswer": 3 },
            { "id": "q31", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кое НЕ е вярно според творбите?", "options": ["А) В 'Потомка' и 'Честен кръст' изборът е изповед", "Б) В 'Честен кръст' и 'Две души' изборът е невъзможен", "В) В 'Честен кръст' и 'Потомка' изборът е категоричен", "Г) В 'Две души' и 'Потомка' изборът е между сила и безсилие"], "correctAnswer": 3 },
            { "id": "q32", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Кое НЕ е вярно за „До моето първо либе“?", "options": ["А) Утвърждава се битовото съществуване", "Б) Идеалът измества девойката", "В) Смъртта в битка е красива", "Г) Народното страдание определя избора"], "correctAnswer": 0 },
            { "id": "q33", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "Чуждото като заплаха за националното самосъзнание е в:", "options": ["А) Балкански синдром", "Б) Крадецът на праскови", "В) Железният светилник", "Г) Балада за Георг Хених"], "correctAnswer": 2 },
            { "id": "q34", "category": "literature", "type": "multiple_choice", "isMultiplayer": true, "question": "В кои творби природата е враждебна сила?", "options": ["А) Песента на колелетата и Градушка", "Б) Спасова могила и История", "В) Крадецът на праскови и Молитва", "Г) Градушка и Ветрената мелница"], "correctAnswer": 3 },
            { "id": "q35", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Запишете ЕДНА идея за поезията в „Честен кръст“.", "correctAnswerText": "Поезията е светиня, с която не се прави компромис." },
            { "id": "q36", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Връзката любов-вяра в „Аз искам да те помня все така“?", "correctAnswerText": "Любовта остава дори когато вярата е изгубена." },
            { "id": "q37", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Стилова особеност на Бай Ганьо в „Бай Ганьо журналист“?", "correctAnswerText": "разговорност / просторечие" },
            { "id": "q38", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Значение на заглавието „Железният светилник“?", "correctAnswerText": "символ на пробуждането / духовността / здравината на традициите" },
            { 
              "id": "q39", 
              "category": "literature", 
              "type": "matching", 
              "isMultiplayer": true, 
              "question": "Свържете заглавието с неговия автор:", 
              "matchingItems": {
                "left": ["А) Спасова могила", "Б) Крадецът на праскови", "В) Балкански синдром"],
                "right": ["1. С. Стратиев", "2. Елин Пелин", "3. Емилиян Станев"]
              },
              "options": ["А) А-2, Б-3, В-1", "Б) А-1, Б-2, В-3", "В) А-3, Б-1, В-2", "Г) А-2, Б-1, В-3"], 
              "correctAnswer": 0, 
              "explanation": "А) Елин Пелин (2), Б) Емилиян Станев (3), В) С. Стратиев (1)" 
            },
            { "id": "q40", "category": "literature", "type": "open_ended", "isMultiplayer": false, "question": "Съпоставете темата за природата в „Ни лъх не дъхва...“ и „При Рилския манастир“.", "correctAnswerText": "Природата като източник на мир и свещен покой." }
          ]
        },
        {
          "sectionId": "part_4_writing",
          "title": "Есе и ЛИС",
          "groups": [
            {
              "groupId": "writing_2024",
              "passage": "Изберете ЕДНА от двете теми и напишете текст.",
              "questions": [
                { 
                  "id": "q41", 
                  "category": "writing", 
                  "type": "essay", 
                  "isMultiplayer": false, 
                  "question": "ТЕМА 1 (ЛИС): 'Животът, любовта и смъртта' върху 'До моето първо либе' ИЛИ ТЕМА 2 (ЕСЕ): 'Щом любов нямам, нищо не съм'" 
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  for (const testData of tests) {
    console.log(`Seeding test: ${testData.testId} for grade ${testData.grade}...`);
    await setDoc(doc(db, 'tests', testData.testId), testData);
  }
  console.log('Initial test data seeded successfully');
}
