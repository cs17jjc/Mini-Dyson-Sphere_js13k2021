rm -rf compiled;
mkdir compiled
cp index.html compiled/
cp main.js compiled/
cp style.css compiled/

cd compiled
google-closure-compiler --js main.js --js_output_file min.js
rm main.js
sed -i 's/main.js/min.js/g' index.html
cd ..
rm compiled.zip
zip -q -9 -r compiled.zip compiled
FILESIZE=$(stat -c%s "compiled.zip")
DELTA=$(expr 13312 - $FILESIZE)
echo "Compiled $FILESIZE bytes, $DELTA bytes left"