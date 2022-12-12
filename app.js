//модуль для работы с файлами
const fs = require("fs");

// чтение исходного файла с заданием (+ кодировка utf8)
const testData = fs.readFileSync("./test.csv", { encoding: "utf8" });

// изначально все выглядит как одна строка. Надо сплитить, чтобы были отдельные строки.
const rowsArray = testData.split("\r\n");

//их условия задачи есть 2 вида начисления: фикс и расчетный. Создаем объект с отображением этих учловий.
const serviceTypesCodes = {
  1: {
    name: "FixedValue",
    value: 301.26,
  },
  2: {
    name: "Counter",
    value: 1.52,
  },
};

// Стрелочная функция (принимает три параметра - тип начислений, новое и старое значения начислений) и тернарный оператор преверяет то, как производятся начисления (либо фикс, либо расчетным методом).
const accrued = (type, newV, oldV) =>
  serviceTypesCodes[type].name === "FixedValue"
    ? serviceTypesCodes[type].value
    : ((newV - oldV) * serviceTypesCodes[type].value).toFixed(2);

// при помощи диструктуризации достаем из массива dataArray первый элемент
const accruedArrayCalc = (dataArray) => {
  const [tableHeader] = dataArray;
  const tableHeaderArray = tableHeader.split(";");
  // console.log(tableHeaderArray);

  // Тут ищем индекс столбца "Тип начисления", используя метод работы с массивом findIndex (проходимся по массиву).
  const indexOfAccrualType = tableHeaderArray.findIndex(
    (el) => el === "Тип начисления"
  );
  // console.log(indexOfAccrualType); индекс будет - 5.

  // Ааналогично. Только ищем индексы еще 2х интересующих нас столбцов "Предыдущее" и "Текущее".
  const indexOfOldVal = tableHeaderArray.findIndex((el) => el === "Предыдущее");
  const indexOfNewVal = tableHeaderArray.findIndex((el) => el === "Текущее");
  // console.log(indexOfOldVal); индекс будет - 6.
  // console.log(indexOfNewVal); индекс будет - 7.

  //  Использую метод массива MAP, чтобы вернуть новый массив, только с полем "Начислено". В параметрах стрелочной функции сам эл-т и индекс.
  return dataArray.map((el, idx) => {
    // !idx то же самое что если бы написать if (inx === 0). У нас тут создается новый массив, у которого будет добавлен столбец "Начислено". Тут смысл что добавится только "Начислено" и все.
    if (!idx) return `${el};Начислено`;
    // из каждой строки исходного массива создается новый массив - 29шт. Они существуют до тех пор, пока работает эта функция.
    const splittedRow = el.split(";");
    //тут вызов функции accured и смотрю на стр 35 41 42. Там вычислял индексы интересующих столбцов. И теперь тут из нового массива достаю значения по трем индексам.
    const accruedValue = accrued(
      splittedRow[indexOfAccrualType],
      splittedRow[indexOfNewVal],
      splittedRow[indexOfOldVal]
    );
    // добавляю значение того, сколько начислено. Это значение берется из вычислений из функции accured.
    // console.log(el, "el");
    // console.log(`${el};${accruedValue}`, "newValue");
    return `${el};${accruedValue}`;
  });
};

// выше сделана первая часть задачи. Теперь надо создать файл с начислениями.
const accruedArray = accruedArrayCalc(rowsArray);
//тут мы джойним из массива строку (чтобы привести в исходный по задаче формат).
const accruedText = accruedArray.join("\r\n");

//функция создания файла - универсальная (т.к. нам надо создать два файла). path - куда записать. dataToAppend - то, что запишется в созданный файл.
const createFile = (path, dataToAppend) => {
  //try проверяет создан ли файл, если да, то в catch мы не попадем.
  try {
    fs.readFileSync(path, { encoding: "utf8" });
  } catch (e) {
    fs.appendFile(path.replace("./", ""), dataToAppend, function (err) {
      if (err) throw err;
    });
  }
};

createFile("./Начисления_абоненты.csv", accruedText);

// вторая часть Начисления по домам-----------------------------------------------------------------------------------------
//суть - создать объект с ключами улицы. У них значение это еще объект, у которого ключи номер дома и тотал начислено.
//
const createUniqueAddressMap = (arr, streetIdx, houseIdx, accruedIdx) => {
  return arr.reduce((acc, current, idx) => {
    // идентично 1й части, отработает только для 1го эл-та.
    if (!idx) return acc;

    //каждый элемент массива это строка, ее надо сделать массивом.
    const rowArr = current.split(";");
    if (!acc[rowArr[streetIdx]]) {
      acc[rowArr[streetIdx]] = [
        { number: rowArr[houseIdx], totalAccrued: +rowArr[accruedIdx] },
      ];
      return acc;
    }

    //здесь проверяем есть ли такая уже улица в объекте, если да, но др дом и добавляем номер дома и начисления
    if (!acc[rowArr[streetIdx]].find((el) => el.number === rowArr[houseIdx])) {
      acc[rowArr[streetIdx]].push({
        number: rowArr[houseIdx],
        totalAccrued: +rowArr[accruedIdx],
      });
      return acc;
    }

    //если в первые два ифа не попали (напр. люди живут по одному адресу), то надо суммировать. Тут ищем индекс дома в уже имеющемся объекте, чтобы потом по этому индексу обратиться к какому-либо объекту.
    const idxOfHouse = acc[rowArr[streetIdx]].findIndex(
      (el) => el.number === rowArr[houseIdx]
    );
    acc[rowArr[streetIdx]][idxOfHouse].totalAccrued += +rowArr[accruedIdx];
    return acc;
  }, {});
};

//считаем тотал по адресу. Пердаем массив dataArray.
const totalByAddress = (dataArray) => {
  //опять достаем хэдэр чтобы найти индексы Улица, № дома, Начислено
  const [tableHeader] = dataArray;
  const tableHeaderArray = tableHeader.split(";");
  const indexOfStreet = tableHeaderArray.findIndex((el) => el === "Улица");
  const indexOfHouseNumber = tableHeaderArray.findIndex(
    (el) => el === "№ дома"
  );
  const indexOfAccrued = tableHeaderArray.findIndex((el) => el === "Начислено");
  return createUniqueAddressMap(
    dataArray,
    indexOfStreet,
    indexOfHouseNumber,
    indexOfAccrued
  );
};

const resultMap = totalByAddress(accruedArray);
// console.log(resultMap);

const arrayByAddress = ["Улица;№ дома;Начислено"];

//Object.entries создает из объекта массив чтобы применить методы массивов. k - key, v - value.
console.log(Object.entries(resultMap));
Object.entries(resultMap).forEach(([k, v]) => {
  const rows = v.map((el) =>
    [k, el.number, el.totalAccrued.toFixed(2)].join(";")
  );
  arrayByAddress.push(rows);
});
console.log(arrayByAddress);

// испл-ем флэт для приведения к одноуровневому масиву.
const indexedString = arrayByAddress
  .flat()
  .map((el, idx) => {
    if (!idx) return `№ строки;${el}\r\n`;
    return `${idx};${el}\r\n`;
  })
  .join("");

createFile("./Начисления_дома.csv", indexedString);
