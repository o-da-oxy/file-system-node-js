import { pipeline } from 'node:stream';
const commander = require('commander');
const fs = require('fs');
const path = require('path');
const isImage = require('is-image');
const sharp = require('sharp');

//COMMANDER
//.option - определить параметры
commander
  .version('0.2.0')
  .option('-i, --input-dir <string>')
  .option('-o, --output-dir <string>')
  .parse(process.argv);

//прикрепить --input-dir == inputDir
const inputDir = commander.opts().inputDir;
const outputDir = commander.opts().outputDir;

const paths = getPathsFromInputDir(inputDir);
console.log('All ImgPaths:');
console.log(paths.imgPaths);
console.log('All FilesPaths:');
console.log(paths.filesPaths);

const newDirs = createOutputDirs(paths, outputDir);
//вроде плохой вариант с setTimeout
setTimeout(pasteFilesToDir, 3000, paths.imgPaths, newDirs.newImgDirPath);
setTimeout(pasteFilesToDir, 3000, paths.filesPaths, newDirs.newFilesDirPath);
setTimeout(convertImages, 5000, newDirs.newImgDirPath);

function getPathsFromInputDir(inputDir: string) {
  const imgPaths: string[] = [];
  const filesPaths: string[] = [];

  //все пути вутри директории inputDir
  const paths: string[] = [inputDir];

  //пока массив путей не пустой
  while (paths.length > 0) {
    const topPath = paths.shift(); //удалить из массива путей верхний путь и вернуть его
    const status = fs.statSync(topPath); //чтобы чекнуть, директория это или файл или что

    if (status.isDirectory()) {
      //вернуть пути ниже topPath
      const followingPaths = fs.readdirSync(topPath).map((item: string) => {
        return path.join(topPath, item); //topPath+item (нормализовать путь)
      });
      paths.push(...followingPaths); //добавить в конец массива путей все следующие пути
    }

    //все пути followingPaths (если не directory) разкидать по двум массивам для фоток и файлов
    else if (topPath && isImage(topPath)) {
      imgPaths.push(topPath); //добавляет эл в конец массива и возвр длину
    } else if (topPath) {
      filesPaths.push(topPath);
    }
  }

  return { imgPaths, filesPaths };
}

function createOutputDirs(
  paths: { imgPaths: string[]; filesPaths: string[] },
  outputDir: string
) {
  //создать новую папку для файлов
  const newFilesDirPath = path.join(outputDir, 'files');
  if (paths.filesPaths) {
    fs.access(newFilesDirPath, (err: any) => {
      if (err) {
        fs.mkdirSync(newFilesDirPath);
        console.log('./files is created');
      } else {
        console.log('./files exists');
        clearDir(newFilesDirPath);
      }
    });
  }

  //создать новую папку для фото
  const newImgDirPath = path.join(outputDir, 'images');
  if (paths.filesPaths) {
    fs.access(newImgDirPath, (err: any) => {
      if (err) {
        fs.mkdirSync(newImgDirPath);
        console.log('./images is created');
      } else {
        console.log('./images exists');
        clearDir(newImgDirPath);
      }
    });
  }

  return { newFilesDirPath, newImgDirPath };
}

function moveFile(input: string, output: string) {
  //создать стримы для чтения и записи
  //на вход файлы
  const inputStream = new fs.createReadStream(input);
  const outputStream = new fs.createWriteStream(output);
  pipeline(inputStream, outputStream, err => {
    if (err) throw err;
  });
}

function clearDir(dirPath: string) {
  let filePath = '';
  fs.readdir(dirPath, (err: any, fileNames: string[]) => {
    fileNames.forEach((fileName: string) => {
      filePath = path.join(dirPath, fileName);
      fs.unlink(filePath, (err: any) => {
        if (err) throw err;
      });
    });
  });
}

//переместить все файлы в созданную папку
function pasteFilesToDir(paths: string[], newDirPath: string) {
  let fileName = '';
  let newFilePath = '';
  paths.forEach((oldPath: string) => {
    fileName = path.basename(oldPath);
    newFilePath = path.join(newDirPath, fileName);
    moveFile(oldPath, newFilePath);
  });
}

function convertImages(imgDir: string) {
  let imgPath = '';
  fs.readdir(imgDir, (err: any, imgNames: string[]) => {
    imgNames.forEach((imgName: string) => {
      imgPath = path.join(imgDir, imgName);
      sharp(imgPath)
        .webp()
        .toFile(path.join(imgDir, `${imgName.split('.')[0]}.webp`));
    });
    imgNames.forEach((imgName: string) => {
      imgPath = path.join(imgDir, imgName);
      fs.unlink(imgPath, (err: any) => {
        if (err) throw err;
      });
    });
  });
}
