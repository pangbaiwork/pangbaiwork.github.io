// 我没学过, 不会写, 别打我.

/**
* 版本历史记录
* 2
* 支持安装 apk 文件功能.

*/

let adb;
let webusb;

let log = (...args) => {
	if (args[0] instanceof Error) {
		console.error.apply(console, args);
	} else {
		console.log.apply(console, args);
	}
	
	$(window).attr('location','#exec-result');
	$("#log").text($("#log").text() + args.join(' ') + '\n');
};

let init = async () => {
	if(!navigator.usb) {
		alert("您的浏览器不支持 webusb 功能, 请使用最新版本 Chrome 浏览器");
		return;
	}
	
	clear();
	try {
		webusb = await Adb.open("WebUSB");
	} catch(error) {
		if (error.message) {
			if(error.message.indexOf('No device') != -1) { // 未选中设备
				return;
			}else if(error.message.indexOf('was disconnected') != -1) {
				alert('无法连接到此设备, 请尝试重新连接');
			}
		}
		
		log(error);
	}
};

let connect = async () => {
	await init();
	if(!webusb) {
		return;
	}
	
	if (webusb.isAdb()) {
		try {
			adb = null;
			adb = await webusb.connectAdb("host::web1n", () => {
				alert('请在你的 ' + webusb.device.productName + ' 设备上允许 ADB 调试');
			});
			
			if (adb != null) {
				let name = webusb.device.productName + '.';
				setDeviceName(name);
				console.log(webusb.device);
			}
		} catch(error) {
			log(error);
			adb = null;
		}
	}
};

let disconnect = async () => {
	if(!webusb){
		return;
	}
	webusb.close();

	setDeviceName(null);
};

let clear = async () => {
	$('#log').text("");
}

let exec_command = async (args) => {
	exec_shell($('#shell').val());
}

let setDeviceName = async (name) => {
	if(!name){
		name = '未连接';
	}
	$('#device_name').each(function(){
		$(this).text(name);
	});
}

let exec_shell = async (command) => {
	if (!adb) {
		alert("未连接到设备");
		return;
	}
	if(!command) {
		return;
	}
	clear();
	showProgress(true);
	
	log('开始执行指令: '+ command + '\n');
	try {
		let shell = await adb.shell(command);
		let r = await shell.receive();
		while (r.data != null) {
			let decoder = new TextDecoder('utf-8');
			let txt = decoder.decode(r.data);
		
			log(txt);
			r = await shell.receive();
		}
		
		shell.close();
	} catch (error) {
		log(error);
	}
	showProgress(false);
};

let push = async (filePath, blob) => {	
	if (!adb) {
		alert("未连接到设备");
		return;
	}
	clear();
	showProgress(true);

	try {
		log("Pushing " + filePath + "...");

		sync = await adb.sync();
		await sync.push(blob, filePath, 0644, null);
		await sync.quit();
		sync = null;
		
		log(filePath + " pushed.");
	}catch(error) {
		log(error);
	}
	showProgress(false);
}

let installApkFile = async() => {
	if (!adb) {
		alert("未连接到设备");
		return;
	}
	let filePath = "/data/local/tmp/" + (new Date()).valueOf() + ".apk";
	let shell = "pm install -r " + filePath;
	console.log(filePath);

	let file = $("#apkFile")[0].files[0];
	if(!file){
		alert("没有选择 apk 文件");
		return;
	}
	clear();
	
	await push(filePath, file);
	await exec_shell(shell);
	alert("安装完成");
}

let pushFile = async() => {
	if (!adb) {
		alert("未连接到设备");
		return;
	}
	
	let filePath = $('#remotefilePath').val();
	let file = $("#file")[0].files[0];
	if(!filePath || !file){
		alert("文件名呢?被你吃了?嗯?");
		return;
	}
	
	push(filePath, file);
}

let showProgress = async (show) => {
	let progress= $('#progress');
	if(show){
		progress.addClass("active");
		progress.addClass("progress-striped");
	}else{
		progress.removeClass("active");
		progress.removeClass("progress-striped");
		
		log("指令执行完毕");
	}
}

let setDeviceOwner = async (component) => {
	if (!adb){
		alert("未连接到设备");
		return;
	}
	if(component == null){
		return;
	}
	clear();
	showProgress(true);
	
	let shell = "CLASSPATH=/data/local/tmp/dpmpro app_process /system/bin com.web1n.dpmpro.Dpm set-device-owner " + component;
	let fileSrc = "https://adb.http.gs/download/dpmpro";
	let remoteFilePath = "/data/local/tmp/dpmpro";
	
	let response = await fetch(fileSrc);
	if(!response.ok) {
		alert("cannot fetch");
		return;
	}
    let data = await response.blob();
	
	await push(remoteFilePath, data);
	await exec_shell(shell);
}

let wifiAdb = async (enable) => {
	if (!adb){
		alert("未连接到设备");
		return;
	}
	let port = $('#tcpip').val();
	if(!enable){
		port = -1;
	}
	if(!port){
		alert("需要填写端口号");
		return;
	}
	clear();
	showProgress(true);

	try {
		await adb.tcpip(port);
		log('tcpip at ' + port);
	} catch (error) {
		log(error);
	}
	showProgress(false);
};

let loadFile = async () => {
	$('#file').click();
	$('#fileName').blur();
}

let loadApkFile = async () => {
	$('#apkFile').click();
	$('#apkFileName').blur();
}

let loadPackageList = async () => {
	if (!adb) {
		alert("未连接到设备");
		return;
	}
	clear();
	showProgress(true);
	
	var packageContent = "";
	
	try {
		let shell = await adb.shell("pm list packages -3"); // 显示第三方应用.
		let r = await shell.receive();
		while (r.data != null) {
			let decoder = new TextDecoder('utf-8');
			packageContent += decoder.decode(r.data);
			r = await shell.receive();
		}
		
		shell.close();
	}catch(error) {
		log(error);
	}
	
	let packageList = $("#package-list");
	packageList.empty();
	
	let arryAll = packageContent.split("\n");
	for(var i = 0, len = arryAll.length; i < len; i++){
		let line = arryAll[i];
		if(line.indexOf("package:") != 0){ // 咋就没有 startWith...
			continue;
		}
		// if(i >= 10){
		//	break; // 不加载啦.
		//}
		
		let packageName = line.substring(8);

		var tr = $("<tr></tr>");
		tr.append("<td>" + packageName + "</td>");

		var showMoreTd = $("<td></td>");
		var showMoreButton = $("<button></button>");
		showMoreButton.addClass("btn btn btn-info");
		showMoreButton.attr("onclick", "exec_shell('am force-stop " + packageName + "')");
		showMoreButton.text("强制停止");
		showMoreButton.appendTo(showMoreTd);
		showMoreTd.appendTo(tr);

		var removeButtonTd = $("<td></td>");
		var removeButton = $("<button></button>");
		removeButton.addClass("btn btn btn-danger");
		removeButton.attr("onclick", "exec_shell('pm uninstall " + packageName + "')");
		removeButton.text("卸载");
		removeButton.appendTo(removeButtonTd);
		removeButtonTd.appendTo(tr);
		
		tr.appendTo(packageList);
	}
	
	console.log("我好菜啊...");
	showProgress(false);
}

$(document).ready(function() {
	if (navigator.usb) {
		$('#nowebusb').hide();
	}
	
	// $('#file') 这家伙是数组...
	let file = $('#file')[0];
	if(file) {
		file.addEventListener('change', function() {
			let fileName = $('#fileName');
	
			let files = file.files;
			if(files.length > 0){
				fileName.text(files[0].name);
			}else{
				fileName.text("未选择文件");
			}
		});
	}
	
	let apkFile = $('#apkFile')[0];
	if(apkFile) {
		apkFile.addEventListener('change', function() {
			let fileName = $('#apkFileName');
	
			let files = apkFile.files;
			if(files.length > 0){
				fileName.text(files[0].name);
			}else{
				fileName.text("未选择文件");
			}
		});
	}
	
	setDeviceName(null); // 设置默认设备名.
});
