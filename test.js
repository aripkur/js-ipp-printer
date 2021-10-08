var fs = require('fs');

fs.readFile('package.json', function (err, data) {
    doPrintOnAllPrinters(data, function (err, job) {
            if (err) {
                console.error('Error printing');
                console.error(err);
            } else {
                console.log('Printed. Job parameters are: ');
                console.log(job);
            }
        }
    );
});