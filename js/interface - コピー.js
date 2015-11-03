﻿enchant();

var STAMP_IMG = "img/drops.png";
var TILE_IMG  = "img/display3.png";

var STAGE_WIDTH  = 320;   // 画面の横幅
var STAGE_HEIGHT = 480;   // 画面の縦幅
var STAMP_SIZE   = 53;    // ドロップの大きさ
var STAMP_KIND   = 6;     // ドロップの種類
var STAMP_COL	 = 6;
var STAMP_ROW	 = 5;
var TOP_MARGIN	 = STAGE_HEIGHT - STAMP_SIZE * STAMP_ROW;

var dragOkFlg;			// ドロップを動かしていいかどうか
var dragStartFlg;		// 移動が始まっている状態かどうか
var dragStartPosX;		// 移動が始まった地点のｘ座標
var dragStartPosY;		// 移動が始まった地点のｙ座標
var dragStamp;			// 移動中のSprite
var changeFlg;			// ドロップが入れ替わったかどうか
var lineFlag = 1;		// 手順線を表示するかどうか

var stampList;			// Spriteのリスト


window.onload = function(){
	game = new Game( STAGE_WIDTH, STAGE_HEIGHT );
	game.fps = 24;
	game.preload( STAMP_IMG, TILE_IMG );

	game.rootScene.backgroundColor = "black";
	game.onload = function(){
		initialize();
		scene = new GameStartScene();
		game.pushScene( scene );
	}
	game.start();
};


function display_line() {					// 手順線をFlagに応じて表示・非表示する関数
	if( lineFlag ){
		line = create_line();
		group.addChild( line );
	}else{
		if( typeof line != "undefined" ) group.removeChild( line );
	}
}


function create_line() {					// 手順の線を描く関数
	var line	= new Sprite( 320, 480 );
	var surface = new Surface( 320, 480 );
	line.image = surface;

	var context = surface.context;
	context.lineWidth = 5;
	context.strokeStyle = "white";
	context.beginPath();

	var ds	  = STAMP_SIZE;
	var st_X  = answer_arr[0] % STAMP_COL;
	var st_Y  = Math.floor(answer_arr[0] / STAMP_COL);
	var st_x  = ds * st_X + ds / 2;
	var st_y  = ds * st_Y + ds / 2;
	context.moveTo( st_x, st_y );

	var next_X  = answer_arr[1] % STAMP_COL;
	var next_Y  = Math.floor(answer_arr[1] / STAMP_COL);
	st_x += ds * (next_X - st_X) / 2;
	st_y += ds * (next_Y - st_Y) / 2;
	context.lineTo( st_x, st_y );
	context.stroke();

	for(i=1, len=answer_arr.length; i<len-1; i++){
		var the_X	= answer_arr[i] % STAMP_COL;
		var the_Y	= Math.floor(answer_arr[i] / STAMP_COL);
		var the_x	= ds * the_X + ds / 2;
		var the_y	= ds * the_Y + ds / 2;

		var pre_X	= answer_arr[i - 1] % STAMP_COL;
		var pre_Y	= Math.floor(answer_arr[i - 1] / STAMP_COL);
		next_X		= answer_arr[i + 1] % STAMP_COL;
		next_Y		= Math.floor(answer_arr[i + 1] / STAMP_COL);

		context.beginPath();
		context.moveTo( st_x, st_y );

		var px = st_x;
		var py = st_y;
		st_x += (next_X - pre_X) * ds / 2;		// 前後のｘ座標、ｙ座標の差で移動距離をとる
		st_y += (next_Y - pre_Y) * ds / 2;

		var grad	= context.createLinearGradient( px, py, st_x, st_y );
		var number	= Math.floor( 255 / (len-2) );
		var r1		= 255 - number * (i - 1);
		var r2		= r1 - number;
		grad.addColorStop( 0, "rgb(" + r1 + "," + r1 + "," + r1 + ")" );
		grad.addColorStop( 1, "rgb(" + r2 + "," + r2 + "," + r2 + ")" );
		context.strokeStyle = grad;

		context.quadraticCurveTo( the_x, the_y, st_x, st_y );
		context.stroke();
	}

	next_X  = answer_arr[i] % STAMP_COL;
	next_Y  = Math.floor(answer_arr[i] / STAMP_COL);
	st_x += ds * (next_X - the_X) / 2;
	st_y += ds * (next_Y - the_Y) / 2;
	context.lineTo( st_x, st_y );
	context.stroke();

	context.beginPath();
	context.arc( ds * st_X + ds / 2, ds * st_Y + ds / 2, 6, 0, 2*Math.PI );
	context.fillStyle = "orange";
	context.fill();

	context.beginPath();
	context.arc( st_x, st_y, 5, 0, 2*Math.PI );
	context.fillStyle = "blue";
	context.fill();

	dropMoveEvent( line );
	return line;
}


GameStartScene = enchant.Class.create(enchant.Scene, {		// メインのシーン
	initialize: function() {
		var coppy_board = board.concat();

		Scene.call(this);

		dragOkFlg = true;
		dragStartFlg = changeFlg = false;

		var tile = new Sprite( STAGE_WIDTH, STAGE_HEIGHT );
		tile.image = game.assets[ TILE_IMG ];
		this.addChild( tile );

		var input_button = new Button("Input");
		input_button.moveTo( 5, 145 );
		input_button.addEventListener( Event.TOUCH_END, function() {
			game.popScene();
			scene = new InputBoardScene();
			game.pushScene( scene );
		});

		var reset_button = new Button("Reset");
		reset_button.moveTo( 58, 145 );
		reset_button.addEventListener( Event.TOUCH_END, function() {
			board = coppy_board;
			game.popScene();
			scene = new GameStartScene();
			game.pushScene( scene );
			display_line();
		});

		var shuffle_button = new Button("Shuffle");
		shuffle_button.moveTo( 111, 145 );
		shuffle_button.addEventListener( Event.TOUCH_END, function() {
			shuffle_board();
			game.popScene();
			scene = new GameStartScene();
			game.pushScene( scene );
			console.log( "\nこの局面は" + count_combo( board ) + "コンボ　最大" + count_max_combo() + "コンボ" );
		});

		var solve_button = new Button("Solve");
		solve_button.moveTo( 164, 145 );
		solve_button.ontouchend = function(){
			beam_search();
			display_line();
		};

		var move_button = new Button("Move");
		move_button.moveTo( 217, 145 );
		move_button.addEventListener( Event.TOUCH_END, function() {
			board = coppy_board;
			game.popScene();
			scene = new GameStartScene();
			game.pushScene( scene );
			changeDrops( 0 );
			display_line();
		});

		var line_button = new Button("Line");
		line_button.moveTo( 270, 145 );
		line_button.addEventListener( Event.TOUCH_END, function() {
			lineFlag = 1 - lineFlag;
			display_line();
		});

		input_button.width  = reset_button.width  = shuffle_button.width  = solve_button.width  = move_button.width  = line_button.width  = 25;
		input_button.height = reset_button.height = shuffle_button.height = solve_button.height = move_button.height = line_button.height = 42;

		this.addChild( input_button );
		this.addChild( reset_button );
		this.addChild( shuffle_button );
		this.addChild( solve_button );
		this.addChild( move_button );
		this.addChild( line_button);

		group = new Group();
		group.y = TOP_MARGIN;
		this.addChild( group );

		stampList = new Array();
		for(var y=0; y<STAMP_ROW; y++)
		for(var x=0; x<STAMP_COL; x++)
			stampList[ fusion(x, y) ] = createStamp(group, x, y);
/*
var all_combo = 0;
var all_length = 0;
		var startTime = new Date();
		for(var i=0; i<100; i++){
			shuffle_board();
			all_combo += beam_search( board );
			all_length += answer_arr.length - 1;
		}
		var endTime = new Date();
		console.log("100回の実行時間：" + (endTime - startTime) / 1000 + "秒" );
		console.log("平均コンボ：" + (all_combo / 100) + "　平均手数：" + (all_length / 100) );
*/
	}
});


function createStamp( stage, x, y ) {		// ドロップのSpriteを作る関数
	var z = fusion( x, y );
	var stamp = new Sprite( STAMP_SIZE, STAMP_SIZE );
	stamp.image = game.assets[ STAMP_IMG ];
	stamp.no	=
	stamp.frame	= board[ z ];
	stamp.x		= STAMP_SIZE * x;
	stamp.y		= STAMP_SIZE * y;
	stage.addChild( stamp );

	dropMoveEvent( stamp );
	return stamp;
}


function createTimer() {
		if( typeof timer != "undefined" ) scene.removeChild( timer );
		timer = new Label();
		timer.moveTo( 10, 90 );
		timer.text = "4.0";
		timer.font = "italic 30px 'ＭＳ 明朝', 'ＭＳ ゴシック', 'Times New Roman', serif, sans-serif";
		timer.color = "white";
		scene.addChild( timer );
}


function dropMoveEvent( drop ){		// ドロップにイベントを追加する関数

	drop.addEventListener( Event.TOUCH_START, function(e){		//ドロップをつかんだ時の処理
		if( dragOkFlg ){
			dragStartFlg		= true;
			changeFlg			= false;
			dragStartPosX		= Math.floor(  e.x				 / STAMP_SIZE );
			dragStartPosY		= Math.floor( (e.y - TOP_MARGIN) / STAMP_SIZE );
			dragStamp			= stampList[ fusion(dragStartPosX, dragStartPosY) ];
			dragStamp.opacity	= 0.3;

			cloneDrop = createStamp( group, dragStartPosX, dragStartPosY );
			cloneDrop.x = e.x - STAMP_SIZE / 2;
			cloneDrop.y = e.y - STAMP_SIZE / 2 - TOP_MARGIN;
			cloneDrop.opacity = 0.6;
			cloneDrop.scale(1.1);
			move_count = 0;

			createTimer();
		}
	});

	drop.addEventListener( Event.TOUCH_MOVE, function(e){		//ドロップを動かしている時の処理
		if( dragStartFlg ){
			var nowX = Math.floor(  e.x					/ STAMP_SIZE );
			var nowY = Math.floor( (e.y - TOP_MARGIN)	/ STAMP_SIZE );
			if( nowX < 0 || STAMP_COL <= nowX || STAMP_ROW <= nowY ) return;
			if( nowY < 0 ) nowY = 0;

			cloneDrop.x = e.x - (STAMP_SIZE / 2);
			cloneDrop.y = e.y - (STAMP_SIZE / 2) - TOP_MARGIN;

			if( dragStartPosX != nowX || dragStartPosY != nowY ){	// ドロップが入れ替わった時
				if( !changeFlg ){
					changeFlg = true;
					createTimer();
					moveTimer = function() {
						this.limit = 4 - (this.age / game.fps);
						this.limit = Math.floor(this.limit * 10) / 10;
						if( this.limit % 1 ) this.text = this.limit;
						else				 this.text = this.limit + ".0";
						if( this.limit == 0 ) touchEndProcessing();
					};
					timer.addEventListener("enterframe", moveTimer);
				}
				var before_Z	= fusion( dragStartPosX, dragStartPosY );
				var after_Z		= fusion( nowX, nowY );
				var moveStamp	= stampList[ after_Z ];
				dragStamp.x		= STAMP_SIZE * nowX;
				dragStamp.y		= STAMP_SIZE * nowY;
				moveStamp.x		= STAMP_SIZE * dragStartPosX;
				moveStamp.y		= STAMP_SIZE * dragStartPosY;

				dragStartPosX = nowX;
				dragStartPosY = nowY;
				change( before_Z, after_Z, board );
				change( before_Z, after_Z, stampList);
				move_count++;
			}
		}
	});

	drop.addEventListener( Event.TOUCH_END, function(){
		touchEndProcessing();
	});
}


function touchEndProcessing() {			// 指がドロップから離れた時の処理
	if( !dragOkFlg ) return;
	
	dragStartFlg		= false;
	dragOkFlg			= false;
	dragStamp.opacity	= 1;
	group.removeChild( cloneDrop );
	if( changeFlg ){
		changeFlg = false;
		timer.removeEventListener("enterframe", moveTimer);
		console.log( count_combo( board ) + "コンボ！ " + move_count + "move" );
		removeDrops();
	}else{
		dragOkFlg = true;
		return;
	}

	if( lineFlag ){
		lineFlag = 0;
		display_line();
		lineFlag = 1;
	}
}


function removeDrops() {				// ドロップを消す関数
	var disappear, target,
		i, j, len, len2;

	disappear = count_combo2( board );
	if( !disappear ){ dragOkFlg = true; return; }
	for(i=0, len =disappear.length;		i<len;	i++)
	for(j=0, len2=disappear[i].length;	j<len2;	j++) {
		target = stampList[ disappear[i][j] ];
		target.tl.delay(15 * i).fadeOut( 17 ).then(function(){ this.parentNode.removeChild( this ); });
	}
	window.setTimeout( dropDrops, 670 * len );
}


function dropDrops() {					// ドロップを落とす関数
	var x, y, i, base;

	for( x=0; x<STAMP_COL; x++ )
	for( y=STAMP_ROW; 0<y; y-- ) {
		base = fusion( x, y );
		if( board[ base ] == 10 ) {
			for( i=0; i<y; i++ ) {
				target = base - STAMP_COL * (i + 1);
				if( board[ target ] != 10 ) {
					change( base, target, board );
					stampList[ base ] = stampList[ target ];
					stampList[ base ].tl.moveTo( STAMP_SIZE * x, STAMP_SIZE * y, 14 ).then(function(){ removeDrops(); });
					break;
				}
			}
		}
	}
}


function changeDrops( count ) {			// answer_arrに基づいてドロップを動かす関数
	var start_index, next_index,
		start_x, next_y,
		start_y, next_y, speed = 11;

	if( count == 0 ) {								// 初回呼び出し時の処理
		target = stampList[ answer_arr[0] ];
		var parent = target.parentNode;
		parent.removeChild( target );				// Spriteを手前に表示するために、親ノードに入れ直す
		parent.addChild( target );
		target.opacity = 0.5;
	}

	if( count + 1 == answer_arr.length ) {
		//setTimeout( function() {removeDrops();}, 700 );
		target.opacity = 1;
		return;
	}

	start_index = answer_arr[ count ];
	next_index	= answer_arr[ count + 1 ];

	start_x = STAMP_SIZE * ( start_index % 6 );
	start_y = STAMP_SIZE * Math.floor( start_index / 6 );

	next_x = STAMP_SIZE * ( next_index % 6 );
	next_y = STAMP_SIZE * Math.floor( next_index / 6 );

	scene.tl.delay(speed).then( function(){
		stampList[ start_index ].tl.moveTo( next_x, next_y, speed );
		//stampList[ next_index ].tl.moveTo( start_x, start_y, speed );
		stampList[ next_index ].tl.delay(speed / 2).then( function(){this.moveTo( start_x, start_y )} );

		setTimeout( function(){ changeDrops( ++count ); }, 0 );

		change( start_index, next_index, stampList );
		change( start_index, next_index, board );
	});
}


InputBoardScene = enchant.Class.create( enchant.Scene, {		// 盤面を手入力するシーン
	initialize: function() {
		Scene.call( this );

		var tile = new Sprite( STAGE_WIDTH, STAGE_HEIGHT );
		tile.image = game.assets[ TILE_IMG ];
		tile.addEventListener( Event.TOUCH_START, function(e){
			addDrops( e );
		});

		tile.addEventListener( Event.TOUCH_MOVE, function(e){
			addDrops( e );
		});
		this.addChild( tile );

		stampList = [];

		for(var i=0; i<STAMP_KIND; i++) {
			var drop = new Sprite( STAMP_SIZE, STAMP_SIZE );
			drop.image = game.assets[ STAMP_IMG ];
			drop.frame = i;
			drop.moveTo( 3 + STAMP_SIZE * i, 80 );
			this.addChild( drop );
			drop.addEventListener( Event.TOUCH_END, function(e) {
				select = e.target.frame;
			});
		}

		var start_button = new Button("Start");
		start_button.moveTo( 164, 145 );
		start_button.width = 26;
		start_button.height = 42;
		this.addChild( start_button );
		start_button.addEventListener( Event.TOUCH_END, function() {
			game.popScene();
			scene = new GameStartScene();
			game.pushScene( scene );
			console.log( "\nこの局面は" + count_combo( board ) + "コンボ　最大" + count_max_combo() + "コンボ" );
		});
	}
});


function addDrops( e ) {
	var touched_X = Math.floor(  e.x				/ STAMP_SIZE );
	var touched_Y = Math.floor( (e.y - TOP_MARGIN)	/ STAMP_SIZE );

	if( touched_X > 5 ) return;
	if( touched_Y < 0 ) return;
	if( select == undefined ) return;
	
	var drop = new Sprite( STAMP_SIZE, STAMP_SIZE );
	drop.image = game.assets[ STAMP_IMG ];
	drop.frame = select;
	drop.x = STAMP_SIZE * touched_X
	drop.y = STAMP_SIZE * touched_Y + TOP_MARGIN;

	var z = fusion( touched_X, touched_Y );
	board[z]		= select;
	if( stampList[z] ) stampList[z].scene.removeChild( stampList[z] );
	stampList[z]	= drop;

	scene.addChild( drop );
	drop.addEventListener( Event.TOUCH_START, function(e) {
		addDrops( e );
	});

	drop.addEventListener( Event.TOUCH_MOVE, function(e) {
		addDrops( e );
	});
}