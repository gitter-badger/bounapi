cancelUnless(parts.length==3, "Bad request", 400);

var _term = decodeURIComponent(parts[0]);
var _department = parts[1];
var _url = decodeURIComponent(parts[2]);

console.log("Fetching link: " + _url);


var requestify = require('requestify');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');

console.log("Fetching department: " + _department);

requestify.responseEncoding('binary').get('http://registration.boun.edu.tr' + _url)
    .then(function(htmlResponse) {
        var body = iconv.decode(htmlResponse.body, 'ISO-8859-9');
        console.log("Fetched department: " + _department);
        parseHtml(body);
    });

function parseHtml(source) {
    var $ = cheerio.load(source);
    var lastCourse = {};
    
    $('table[border="1"] tr:not(.schtitle)').each(function(i, tr) {
        
        var row = [];

        $(this).find('td').each(function(j, td) {
            row.push($(this).text().trim());
        });

        var course = {};
        course.term = _term;
        course.department = _department;
        

        if (!(/\S/.test(row[0]))) { //This row is P.S. or LAB
            course = JSON.parse(JSON.stringify(lastCourse));
            
            if (/^\s*LAB\s*$/.test(row[2])) {
                course.isLab = true;
                course.isPS = false;
            } else {
                course.isPS = true;
                course.isLab = false;
            }

        } else {
            lastCourse = course;
            var arr = /([A-Za-z]+?)\s*(\d+\w+)\.(\d+)/.exec(row[0]);
            course.name = arr[1];
            course.code = arr[2];
            course.section = arr[3];

            course.title = row[2];
            course.credits = row[3];
            course.ects = row[4];
            //course.quota = row[5];

            course.isLab = false;
            course.isPS = false;
        }
        
        course.instructor = row[6];
        console.log(course.instructor);

        course.forDepartments = row[13].slice(0, -1).split(";");
        if (course.forDepartments[0] === "") {
            course.forDepartments = [];
        }
        
        course.classes = [];
        
        if(row[7] != "TBA") {
            var days = [];
            var matches = [];
            var regex = /[MTWF]h?/g;
            
            while(matches=regex.exec(row[7])) {
                days.push(matches[0]);
            }
                        
            var hours = row[8].split("");
            var places = row[9].split(" | ");

            for(var i=0; i<days.length; i++) {
                course.classes[i] = {day: days[i], hour: hours[i], place: places[i]};
            }
        }

        console.log("Storing course: " + course.name + course.code + "." + course.section);
        
        dpd.courses.post(course, function(result, error) {
            if(error) {
                console.log(error);
                cancel(error, 566);
            } else {
                //console.log("OK");
            }
        });
    });
    
}