var ipp = require('ipp'); 
var request = require('request');
var fs = require('fs');
var axios = require('axios');

function getPrinterUrls(callback) {
    var CUPSurl = 'http://localhost:631/ipp/printer';//todo - change of you have CUPS running on other host
    request(CUPSurl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var printersMatches = body.match(/<TR><TD><A HREF="\/printers\/([a-zA-Z0-9-^"]+)">/gm);//i know, this is terrible, sorry(
            var printersUrls = [];
            var i;
            if (printersMatches) {
                for (i = 0; i < printersMatches.length; i++) {
                    var a = (/"\/printers\/([a-zA-Z0-9-^"]+)"/).exec(printersMatches[i]);
                    if (a) {
                        printersUrls.push(CUPSurl + '/' + a[1]);
                    }
                }
            }
        }
        callback(error, printersUrls);
    });
};

function doPrintOnSelectedPrinter(uriPrinter, bufferToBePrinted, callback) {
    let printer = ipp.Printer(uriPrinter)
    printer.execute("Get-Printer-Attributes", null, function(err, printerStatus){
        if(printerStatus['printer-attributes-tag']['printer-state']=='idle'){
            console.log('printer siap !', printerStatus['printer-attributes-tag']['printer-state']);
            printer.execute("Print-Job",
                {
                    "operation-attributes-tag":{
                        "requesting-user-name":"nodejs",
                        "job-name":"testing",
                        "document-format" : "application/octet-stream"
                    },
                    "job-attributes-tag":{},
                    data:bufferToBePrinted
                },
                function (err, res) {
                    if (res.statusCode == 'successful-ok') {
                        var jobUri = res['job-attributes-tag']['job-uri'];
                        var tries = 0;
                        var t = setInterval(function () {
                            printer.execute("Get-Job-Attributes",
                                {"operation-attributes-tag":{'job-uri':jobUri}},
                                function (err2, job) {
        //                            console.log(job);
                                    if (err2) throw err2;
                                    tries++;
                                    if (job && job["job-attributes-tag"]["job-state"] == 'completed') {
                                        clearInterval(t);
        //                                console.log('Testins if job is ready. Try N '+tries);
                                        callback(null, job);//job is succesefully printed!
                                    }
                                    if (tries > 50) {//todo - change it to what you need!
                                        clearInterval(t);
                                        printer.execute("Cancel-Job", {
                                            "operation-attributes-tag":{
                                                "job-uri":jobUri,  //uncomment this
        //*/
                                                // "printer-uri":printer.uri, //or uncomment this two lines - one of variants should work!!!
                                                "job-id":job["job-attributes-tag"]["job-id"]
        //*/
                                            }
                                        }, function (err, res) {
                                            if (err) throw err;
                                            console.log('Job with id '+job["job-attributes-tag"]["job-id"]+'is being canceled');
                                        });

                                        callback(new Error('Job is canceled - too many tries and job is not printed!'), null);

                                    }
                                });
                        }, 2000);
                    } else {
                        callback(new Error('Error sending job to printer!'), null);
                    }
            });
        } else {
            callback(new Error('Printer '+printerStatus['printer-attributes-tag']['printer-name']+' is not ready!'),null);
        }
    });
}

function doPrintOnAllPrinters(data, callback) {
    var b = new Buffer(data, 'binary');
    getPrinterUrls(function (err, printers) {
        if (err) throw err;
        if (printers) {
            for (var i = 0; i < printers.length; i++) {
                var printer = ipp.Printer(printers[i]);
                doPrintOnSelectedPrinter(printer, b, callback);
            }
        } else {
            throw new Error('Unable to find printer. Do you have printer installed and accessible via CUPS?');
        }
    });
}

async function getUser() {
    try {
      const response = await axios.get('http://localhost/rsibyl/pendaftaran/rawat_jalan/print_label/1');
      var b = new Buffer.from(response.data, 'binary');
      console.log(b);

      doPrintOnSelectedPrinter("ipp://192.168.11.26/ipp/print", b, function(err, job){
          if(err){
              console.log("ipp error", err)
          }else{
            console.log("ipp success", job)
          }
      })
    } catch (error) {
      console.error(error);
    }
}

//   getPrinterUrls(function(err, printer){
//       if(err){
//           console.log(err)
//       }else{
//           console.log(printer)
//       }
//   })
getUser()

// fs.readFile('package.json', function (err, data) {
//     doPrintOnSelectedPrinter(data, function (err, job) {
//             if (err) {
//                 console.error('Error printing');
//                 console.error(err);
//             } else {
//                 console.log('Printed. Job parameters are: ');
//                 console.log(job);
//             }
//         }
//     );
// });