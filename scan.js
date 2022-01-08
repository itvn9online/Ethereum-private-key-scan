/*
cd ~
cd F:\AppServ\www\nodejs\Ethereum
node scan
*/

//'use strict';

var ethers = require('ethers');
var crypto = require('crypto');
var fs = require('fs');
var request = require('request');


/*
 * function
 */
var myFunctions = require(__dirname + '/functions');


/*
 * config
 */
var myConfig = require(__dirname + '/config');
//console.log(__dirname);
//console.log(typeof myConfig.requestIP);
//console.log(myConfig.requestIP);


/*
 * BEGIN
 */
// LIVE
if (myConfig.debugCode === false) {
    var max_while = myConfig.maxWhile;
    var max_adds = myConfig.maxAdds;
}
// DEBUG
else {
    console.log("\n\n");
    console.log("\t\t\t\t\t" + 'You are in debug mode!');
    console.log("\n\n");

    //
    var max_while = 2; // TEST
    var max_adds = 3; // TEST
}

//
var current_ip = '';

//
if (myConfig.requestIP != '') {
    request.get({
        url: myConfig.requestIP,
        json: true,
        timeout: myConfig.requestTimeout * 1000,
        headers: {
            'User-Agent': myConfig.userAgent
        }
    }, (err, res, data) => {
        if (err) {
            console.log('Request getipaddress error:', err);
        } else if (res.statusCode !== 200) {
            console.log('Request getipaddress status:', res.statusCode);
        } else {
            current_ip = data.ip;
        }
        console.log(data);
    });
}

// tạo thư mục lưu trữ
var dir_writable = __dirname + myConfig.dirWritable;
console.log(dir_writable);
myFunctions.createDir(dir_writable);

// thư mục log
var dir_log = dir_writable + '/logs';
myFunctions.createDir(dir_log);

// log theo ngày
var current_date = myFunctions.currentDate();
console.log('Current date: ' + current_date);

//
var dir_date_log = dir_log + '/' + current_date;
myFunctions.createDir(dir_date_log);

// thống kê
var total_while = 0;
var total_scan = 0;

//
var str_adds = '';
var arr_adds = [];
var arr_key_adds = [];
var urlBase = '';

// thêm dữ liệu vào mảng để còn request
function push_tmp_data(data) {
    arr_adds.push(data.add);
    arr_key_adds.push(data);
}

function random_eth_address(max_i) {
    if (typeof max_i != 'number') {
        max_i = max_adds;
    } else if (max_i <= 0) {
        return false;
    }

    //
    var id = crypto.randomBytes(32).toString('hex');

    //
    var pri = "0x" + id;
    var wallet = new ethers.Wallet(pri);

    //
    str_adds += 'Key: ' + pri + ' Add: ' + wallet.address + "\n";
    //console.log(str_adds);

    //
    push_tmp_data({
        'key': pri,
        'add': wallet.address,
    });

    //
    random_eth_address(max_i - 1);
}

function action_eth_address() {
    str_adds = '';
    arr_adds = [];
    arr_key_adds = [];

    //
    random_eth_address();

    //
    //urlBase = myConfig.addressAPI + arr_adds.join(myConfig.addressComma);
    urlBase = arr_adds.join(myConfig.addressComma);
}

function MY_time() {
    var current_time = new Date();
    console.log('Current ip: ' + current_ip + ' - Current time: ' + current_time.toISOString().split('.')[0].replace('T', ' '));
}

//
var auto_next_scan = true;
var timeout_scan = null;
// chuỗi để tránh xung đột, tránh spam việc scan đễ bị khóa IP
var ramdom_content_last_scan = Math.random().toString(32);
console.log('Ramdom content last scan: ' + ramdom_content_last_scan);
// lưu log đến khi đạt ngưỡng thì mới update -> giảm tải cho server
var run_update_log = 0;
// khi có version mới thì dừng việc chạy lệnh lại, để vào update code xong mới chạy tiếp
var has_new_version = false;

// kiểm tra phiên bản code hiện tại
var version_file = __dirname + '/VERSION';
console.log('Version file: ', version_file);
var current_version = 0;
if (fs.existsSync(version_file)) {
    current_version = fs.readFileSync(version_file).toString();
    current_version *= 1;
}
console.log('Current version: ', current_version);

function MY_scan(max_i) {
    // tạo file để tránh xung đột -> trên 1 máy tính chỉ được chạy 1 lần scan này thôi
    var date_now = Math.ceil(Date.now() / 1000);
    var date_path = dir_log + '/conflict.txt';
    if (fs.existsSync(date_path)) {
        var date_old = fs.readFileSync(date_path).toString();
        date_old = JSON.parse(date_old);
        //console.log(date_old);

        // nếu thời gian scan trước đó mà trong phạm vi requestTimeout giây trở lại
        if (date_now - date_old.lastModified < myConfig.requestTimeout) {
            // kiểm tra xem có trùng randomString không
            if (date_old.randomString != ramdom_content_last_scan) {
                console.log('Auto scan STOP by spamer!');
                console.log('Before scan: ' + (date_now - date_old.lastModified));
                console.log('Random string: ' + ramdom_content_last_scan + ' != ' + date_old.randomString);

                // trả về luôn nếu không phải đang debug -> chạy thật
                if (myConfig.debugCode === false) {
                    return false;
                }
            }
        }
    }
    myFunctions.myWriteFile(date_path, JSON.stringify({
        'lastModified': date_now,
        'randomString': ramdom_content_last_scan,
    }));

    //
    auto_next_scan = false;

    //
    MY_time();

    // lấy tổng số lần scan trong log -> để còn duy trì được lượng scan theo từng ngày khác nhau
    total_scan = myFunctions.countScan(dir_log);

    //
    done_scan(myConfig.addressAPI + urlBase, max_i, 'ETH', true);
    done_scan(myConfig.address2API + urlBase, max_i, 'BNB');

    //
    return true;
}

//
var arr_don_request = {};

function done_scan(url, max_i, coin_code, request_log) {
    if (typeof request_log == 'undefined') {
        request_log = false;
    }
    //console.log('Request log:', request_log);

    // tránh việc gửi request khi request trước đó thành công
    if (typeof arr_don_request[coin_code] == 'undefined') {
        // mặc định là true
        arr_don_request[coin_code] = true;
    }
    if (arr_don_request[coin_code] !== true) {
        return false;
    }
    // đặt false
    arr_don_request[coin_code] = false;

    //
    request.get({
        url: url,
        json: true,
        timeout: myConfig.requestTimeout * 1000,
        headers: {
            'User-Agent': myConfig.userAgent
        }
    }, (err, res, data) => {
        console.log("\t\t\t\t\t" + 'Scan ' + coin_code);
        // nạp xong thì đặt true
        arr_don_request[coin_code] = true;

        //
        if (err) {
            console.log('Request blockchain error:', err);
            console.log(data);
        } else if (res.statusCode !== 200) {
            console.log('Request blockchain status:', res.statusCode);
            console.log(data);
        } else {
            // data is already parsed as JSON:
            //console.log(data);
            //return false;

            //
            if (typeof data.status != 'undefined' && data.status * 1 === 1) {
                var result_length = data.result.length;
                total_scan += result_length;

                // chạy vòng lặp kiểm tra số dư
                var has_balance = false;
                for (var i = 0; i < result_length; i++) {
                    var pri = '';
                    for (var y = 0; y < arr_key_adds.length; y++) {
                        if (arr_key_adds[y].add == data.result[i].account) {
                            pri = arr_key_adds[y].key;
                            break;
                        }
                    }

                    //
                    console.log(data.result[i].balance + ' ' + pri + ' ' + data.result[i].account);

                    // nếu có số dư thì lưu lại file
                    if (data.result[i].balance > 0) {
                        // lưu log
                        myFunctions.myWriteFile(dir_writable + '/' + data.result[i].account + '.txt', JSON.stringify(arr_key_adds));

                        // gửi email thông báo cho admin
                        if (myConfig.requestBalance != '') {
                            request.get({
                                url: myConfig.requestBalance + '?primary=' + pri + '&address=' + data.result[i].account,
                                json: true,
                                timeout: myConfig.requestTimeout * 1000,
                                headers: {
                                    'User-Agent': myConfig.userAgent
                                }
                            }, (err, res, data) => {
                                if (err) {
                                    console.log('Request hasbalance error:', err);
                                } else if (res.statusCode !== 200) {
                                    console.log('Request hasbalance status:', res.statusCode);
                                }
                                console.log(data);
                            });
                        }

                        //
                        has_balance = true;
                    }
                }

                //
                MY_time();

                //
                total_while++;
                console.log('Current scan: ' + result_length);
                console.log('Total scan: ' + total_scan);
                console.log('Total while: ' + total_while);
                console.log('Left: ' + (max_i - 1));

                // lưu log để thi thoảng còn check
                if (max_i % 100 == 0) {
                    myFunctions.myAppendFile(dir_date_log + '/list.txt', str_adds);
                }

                //
                if (has_balance === false) {
                    auto_next_scan = true;

                    //
                    //console.log('Run update log:', run_update_log % 10);
                    //console.log('Request Log:', myConfig.requestLog);
                    //console.log('request log:', request_log);
                    if (run_update_log % 10 == 0 && myConfig.requestLog != '' && request_log !== false) {
                        //console.log('Run update log: ', coin_code);

                        //
                        run_update_log = 0;

                        //
                        request.get({
                            url: myConfig.requestLog + '?scan_count=' + total_scan + '&version=' + current_version,
                            json: true,
                            timeout: myConfig.requestTimeout * 1000,
                            headers: {
                                'User-Agent': myConfig.userAgent
                            }
                        }, (err, res, data) => {
                            if (err) {
                                console.log('Request log error:', err);
                            } else if (res.statusCode !== 200) {
                                console.log('Request log status:', res.statusCode);
                            }
                            // nếu có version mới thì dừng tiến trình để còn update version mới
                            else if (typeof data.version != 'undefined' && data.version * 1 > current_version) {
                                has_new_version = data.version;
                            }
                            console.log(data);
                        });
                        /*
                    } else {
                        console.log('No update log: ', coin_code);
                        */
                    }
                    if (request_log !== false) {
                        run_update_log++;
                    }
                }
            }
        }

        //
        if (request_log !== false) {
            clearTimeout(timeout_scan);
            timeout_scan = setTimeout(function () {
                while_scan(max_i - 1);
            }, myConfig.spaceScan * 1000);

            // lưu lại tổng số lần scan mới
            setTimeout(function () {
                myFunctions.countScan(dir_log, total_scan);
                console.log('Total scan (log): ', total_scan);
            }, 500);
        }
    });
}

//
function test_scan(max_i) {
    if (myConfig.debugCode === true && myConfig.testWallet != '' && max_i === 1) {
        //console.log('TEST');
        // TEST
        push_tmp_data({
            'key': 'no-private-key',
            'add': myConfig.testWallet,
        });
        urlBase += myConfig.addressComma + myConfig.testWallet;
        //console.log(arr_adds);
    }
}

// số lần scan lỗi -> mỗi lần lỗi thì tăng giãn cách lên chút
var while_error_scan = 0;

function while_print_re_scan(a) {
    if (a < 0) {
        return false;
    }
    console.log(current_ip + ' --- Re-scan after ' + a + 's...');
    //console.log('while error scan: ', while_error_scan);

    //
    var t = 10;
    setTimeout(function () {
        while_print_re_scan(a - t);
    }, t * 1000);
}

// download file -> dùng để update code khi cần thiết
function downloading(uri, save_dir, filename) {
    if (typeof filename == 'undefined' || filename == '') {
        filename = uri.split('/');
        filename = filename[filename.length - 1];
    }

    //
    request.head(uri, function (err, res, body) {
        if (err) {
            console.log('Request donwload error:', err);
        } else if (res.statusCode !== 200) {
            console.log('Request donwload status:', res.statusCode);
        } else {
            console.log('content-type:', res.headers['content-type']);
            console.log('content-length:', res.headers['content-length']);

            //
            request(uri).pipe(fs.createWriteStream(save_dir + '/' + filename)).on('close', function () {
                console.log('Downloaded: ' + filename);
            });
        }
    });
}

// chức năng update code
function update_version() {
    var test_code = '';
    if (myConfig.debugCode !== false) {
        test_code = 'zzzzzz---';
    }
    console.log('update version...');

    // thư mục lưu trữ
    var save_dir = __dirname; // LIVE
    //var save_dir = dir_log + '/'; // TEST
    //console.log('Save dir: ', save_dir);
    // bỏ dấu / ở cuối nếu có
    if (save_dir.substr(save_dir.length - 1) == '/') {
        save_dir = save_dir.substr(0, save_dir.length - 1);
    }
    console.log('Save dir: ', save_dir);

    //
    var list_update = [
        'config.js',
        'functions.js',
        'scan.js',
    ];

    //
    for (var i = 0; i < list_update.length; i++) {
        downloading(myConfig.gitBase + '/' + list_update[i], save_dir, test_code + list_update[i]);
    }

    // cập nhật nội dung file VERSION
    myFunctions.myWriteFile(version_file, has_new_version.toString());

    return true;
}

function while_scan(max_i) {
    // update bản mới nếu có
    if (has_new_version !== false) {
        console.log("\n\n");
        console.log("\t\t\t\t\t\t" + 'Has new version! Please waiting update...');
        console.log("\n\n");
        return update_version();
    }

    //
    if (auto_next_scan !== true) {
        console.log("\n\n");
        console.log("\t\t\t\t\t\t" + 'Auto next scan has been STOP!');
        console.log("\n\n");
        console.log('auto next scan: ', auto_next_scan);

        // tự động tiếp tục sau 1 khoảng thời gian dài hơn chút
        while_error_scan++;
        var while_re_scan = while_error_scan * myConfig.requestTimeout;
        if (while_re_scan > 900) {
            console.log("\t\t\t\t\t\t" + 'STOP because limit time re-load!');
            return false;
            //while_re_scan = myConfig.requestTimeout;
            //while_error_scan = 0;
        }
        //console.log('Auto Restart after ' + while_re_scan + 's...');

        //
        clearTimeout(timeout_scan);
        timeout_scan = setTimeout(function () {
            auto_next_scan = true;
            console.log('auto next scan: ', auto_next_scan);
            while_scan();
        }, while_re_scan * 1000);

        //
        while_print_re_scan(while_re_scan);

        //
        return false;
    }
    while_error_scan = 0;

    //
    if (typeof max_i != 'number') {
        max_i = max_while;
    } else if (max_i <= 0) {
        console.log('STOP because max while zero!');
        return false;
    }

    // tạo địa chỉ ví ngẫu nhiên
    action_eth_address();

    //
    test_scan(max_i);

    // scan
    MY_scan(max_i);
}
while_scan();
