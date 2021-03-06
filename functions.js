var fs = require('fs');

module.exports = {
    // tạo thư mục nếu chưa có
    createDir: function (dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
            fs.chmodSync(dir, 0777);
        }
    },

    // ghi đè vào file
    myWriteFile: function (f, c) {
        /*
         * f: file save to
         * c: content
         */

        //
        fs.writeFile(f, c, function (err) {
            if (err) throw err;
            console.log('Saved (write)! ' + f);
        });
        //fs.chmodSync(f, 0777);
    },

    // ghi thêm nội dung vào file
    myAppendFile: function (f, c) {
        /*
         * f: file save to
         * c: content
         */

        //
        fs.appendFile(f, c, function (err) {
            if (err) throw err;
            console.log('Saved (append)! ' + f);
        });
        //fs.chmodSync(f, 0777);
    },

    countScan: function (d, c) {
        /*
         * d: dir
         * c: content
         */
        var count_path = d + '/count.txt';
        //console.log(count_path);
        //return true;

        // có nội dung thì lưu nội dung
        if (typeof c == 'number' && c != '') {
            this.myWriteFile(count_path, c.toString());
            return true;
        }

        // không có thì kiểm tra và lấy dữ liệu trả về
        if (fs.existsSync(count_path)) {
            var a = fs.readFileSync(count_path).toString();
            a *= 1;
            if (isNaN(a)) {
                a = 0;
            }
            //console.log('Count scan (log): ', a);

            //
            return a;
        }

        //
        return 0;
    },

    // trả về ngày hiện tại
    currentDate: function () {
        var a = new Date();
        return a.toISOString().split('T')[0];
    },

    // tạo log theo năm/tháng/ngay
    logWithDate: function (dir_log, current_date) {
        current_date = current_date.split('-');
        for (var i = 0; i < current_date.length; i++) {
            dir_log += '/' + current_date[i];
            this.createDir(dir_log);
        }
        
        //
        return dir_log;
    },

    // lười viết dấu , ở cuối nên làm cái author cho nó tiện
    authorEmail: 'itvn9online@gmail.com'
};
