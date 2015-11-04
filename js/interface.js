enchant();
enchant.ENV.USE_TOUCH_TO_START_SCENE = false;

var DROP_IMG = "img/drops.png";
var TILE_IMG = "img/display3.png";

var STAGE_WIDTH  = 320;   // 画面の横幅
var STAGE_HEIGHT = 460;   // 画面の縦幅
var DROP_SIZE	 = 53;    // ドロップの大きさ
var DROP_KIND    = 6;     // ドロップの種類
var DROP_COL	 = 6;
var DROP_ROW	 = 5;
var TOP_MARGIN	 = STAGE_HEIGHT - DROP_SIZE * DROP_ROW;

var dragOkFlg;			// ドロップを動かしていいかどうか
var dragStartFlg;		// 移動が始まっている状態かどうか
var dragStartPosX;		// 移動が始まった地点のｘ座標
var dragStartPosY;		// 移動が始まった地点のｙ座標
var dragDrop;			// 移動中のSprite
var changeFlg;			// ドロップが入れ替わったかどうか
var lineFlag = 1;		// 手順線を表示するかどうか
var timeLimitFlag = 0;	// 時間制限を設けるかどうか

var dropList;			// Spriteのリスト
var buttonList = [];


windowonload = function(){
	game = new Game( STAGE_WIDTH, STAGE_HEIGHT );
	game.fps = 24;
	game.preload( DROP_IMG, TILE_IMG );

	game.rootScene.backgroundColor = "black";
	game.onload = function(){
		initialize();
		scene = new GameStartScene();
		game.pushScene( scene );
	}
	game.start();
};


function display_line() {					// 手順線をFlagに応じて表示・非表示する関数
	if( lineFlag && answer_arr.length ){
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

	var ds	  = DROP_SIZE;
	var st_X  = answer_arr[0] % DROP_COL;
	var st_Y  = Math.floor(answer_arr[0] / DROP_COL);
	var st_x  = ds * st_X + ds / 2;
	var st_y  = ds * st_Y + ds / 2;
	context.moveTo( st_x, st_y );

	var next_X  = answer_arr[1] % DROP_COL;
	var next_Y  = Math.floor(answer_arr[1] / DROP_COL);
	st_x += ds * (next_X - st_X) / 2;
	st_y += ds * (next_Y - st_Y) / 2;
	context.lineTo( st_x, st_y );
	context.stroke();

	for( i=1, len=answer_arr.length; i<len-1; i++ ){
		context.beginPath();
		context.moveTo( st_x, st_y );

		var the_X	= answer_arr[i] % DROP_COL;
		var the_Y	= Math.floor(answer_arr[i] / DROP_COL);
		var the_x	= ds * the_X + ds / 2;
		var the_y	= ds * the_Y + ds / 2;
		next_X		= answer_arr[i + 1] % DROP_COL;
		next_Y		= Math.floor(answer_arr[i + 1] / DROP_COL);

		var px = st_x;
		var py = st_y;
		st_x = ds * (the_X + next_X + 1) / 2;
		st_y = ds * (the_Y + next_Y + 1) / 2;

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

	the_X  = answer_arr[i] % DROP_COL;
	the_Y  = Math.floor(answer_arr[i] / DROP_COL);
	st_x = ds * the_X + ds / 2;
	st_y = ds * the_Y + ds / 2;
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
		buttonList[0] = input_button;
		input_button.moveTo( 5, 145 );
		input_button.addEventListener( Event.TOUCH_END, function() {
			game.popScene();
			scene = new InputBoardScene();
			game.pushScene( scene );
		});

		var reset_button = new Button("Reset");
		buttonList[1] = reset_button;
		reset_button.moveTo( 58, 145 );
		reset_button.addEventListener( Event.TOUCH_END, function() {
			board = coppy_board;
			game.popScene();
			scene = new GameStartScene();
			game.pushScene( scene );
			if( typeof answer_arr != "undefined" && answer_arr.length ) display_line();
		});

		var shuffle_button = new Button("Shuffle");
		buttonList[2] = shuffle_button;
		shuffle_button.moveTo( 111, 145 );
		shuffle_button.addEventListener( Event.TOUCH_END, function() {
			shuffle_board();
			game.popScene();
			scene = new GameStartScene();
			game.pushScene( scene );
			console.log( "\nこの局面は" + count_combo( board ) + "コンボ　最大" + count_max_combo() + "コンボ" );
			answer_arr = [];
		});

		var solve_button = new Button("Solve");
		buttonList[3] = solve_button;
		solve_button.moveTo( 164, 145 );
		solve_button.ontouchend = function(){
			beam_search();
			display_line();
		};

		var move_button = new Button("Move");
		buttonList[4] = move_button;
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
		buttonList[5] = line_button;
		line_button.moveTo( 270, 145 );
		line_button.addEventListener( Event.TOUCH_END, function() {
			lineFlag = 1 - lineFlag;
			display_line();
		});

		for(var i=0, len=buttonList.length; i<len; i++) {
			buttonList[i].width = 25;
			buttonList[i].height = 42;
			buttonList[i].moveBy(0, -20);
			this.addChild( buttonList[i] );
		}

		var changeTLF = new Sprite( DROP_SIZE, DROP_SIZE );
		changeTLF.image = game.assets[ DROP_IMG ];
		changeTLF.frame = 7;
		this.addChild( changeTLF );
		changeTLF.addEventListener( Event.TOUCH_END, function(){
			timeLimitFlag = 1 - timeLimitFlag;
		});

		group = new Group();
		group.y = TOP_MARGIN;
		this.addChild( group );

		dropList = new Array();
		for(var y=0; y<DROP_ROW; y++)
		for(var x=0; x<DROP_COL; x++)
			dropList[ fusion(x, y) ] = createDrop( group, x, y );
/*
var all_combo = 0;
var all_length = 0;
		var startTime = new Date();
		for(var i=0; i<1000000; i++){
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


function createDrop( stage, x, y ) {		// ドロップのSpriteを作る関数
	var z = fusion( x, y );
	var drop = new Sprite( DROP_SIZE, DROP_SIZE );
	drop.image = game.assets[ DROP_IMG ];
	drop.no	=
	drop.frame	= board[ z ];
	drop.x		= DROP_SIZE * x;
	drop.y		= DROP_SIZE * y;
	stage.addChild( drop );

	dropMoveEvent( drop );
	return drop;
}


function createTimer() {					// 時間制限ラベルを作る関数
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
			dragStartPosX		= Math.floor(  e.x				 / DROP_SIZE );
			dragStartPosY		= Math.floor( (e.y - TOP_MARGIN) / DROP_SIZE );
			dragDrop			= dropList[ fusion(dragStartPosX, dragStartPosY) ];
			dragDrop.opacity	= 0.3;

			cloneDrop = createDrop( group, dragStartPosX, dragStartPosY );
			cloneDrop.x = e.x - DROP_SIZE / 2;
			cloneDrop.y = e.y - DROP_SIZE / 2 - TOP_MARGIN;
			cloneDrop.opacity = 0.6;
			cloneDrop.scale(1.1);
			move_count = 0;

			if( timeLimitFlag )createTimer();
		}
	});

	drop.addEventListener( Event.TOUCH_MOVE, function(e){		//ドロップを動かしている時の処理
		if( dragStartFlg ){
			var nowX = Math.floor(  e.x					/ DROP_SIZE );
			var nowY = Math.floor( (e.y - TOP_MARGIN)	/ DROP_SIZE );
			if( nowX < 0 || DROP_COL <= nowX || DROP_ROW <= nowY ) return;
			if( nowY < 0 ) nowY = 0;

			cloneDrop.x = e.x - (DROP_SIZE / 2);
			cloneDrop.y = e.y - (DROP_SIZE / 2) - TOP_MARGIN;

			if( dragStartPosX != nowX || dragStartPosY != nowY ){	// ドロップが入れ替わった時
				if( !changeFlg ){
					changeFlg = true;
					if( timeLimitFlag ){
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
				}
				var before_Z	= fusion( dragStartPosX, dragStartPosY );
				var after_Z		= fusion( nowX, nowY );
				var moveDrop	= dropList[ after_Z ];
				dragDrop.x		= DROP_SIZE * nowX;
				dragDrop.y		= DROP_SIZE * nowY;
				moveDrop.x		= DROP_SIZE * dragStartPosX;
				moveDrop.y		= DROP_SIZE * dragStartPosY;

				dragStartPosX = nowX;
				dragStartPosY = nowY;
				change( before_Z, after_Z, board );
				change( before_Z, after_Z, dropList );
				move_count++;
			}
		}
	});

	drop.addEventListener( Event.TOUCH_END, function(){
		touchEndProcessing();
	});
}


function touchEndProcessing() {			// ドロップから指が離れた時の処理
	if( !dragOkFlg ) return;
	
	dragStartFlg		= false;
	dragOkFlg			= false;
	dragDrop.opacity	= 1;
	group.removeChild( cloneDrop );
	if( changeFlg ){
		changeFlg = false;
		if( timeLimitFlag )timer.removeEventListener("enterframe", moveTimer);
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
		target = dropList[ disappear[i][j] ];
		target.tl.delay(15 * i).fadeOut( 17 ).then(function(){ this.parentNode.removeChild( this ); });
	}
	window.setTimeout( dropDrops, 670 * len );
}


function dropDrops() {					// ドロップを落とす関数
	var x, y, i, base;

	for( x=0; x<DROP_COL; x++ )
	for( y=DROP_ROW; 0<y; y-- ) {
		base = fusion( x, y );
		if( board[ base ] == 10 ) {
			for( i=0; i<y; i++ ) {
				target = base - DROP_COL * (i + 1);
				if( board[ target ] != 10 ) {
					change( base, target, board );
					dropList[ base ] = dropList[ target ];
					dropList[ base ].tl.moveTo( DROP_SIZE * x, DROP_SIZE * y, 14 ).then(function(){ removeDrops(); });
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
		target = dropList[ answer_arr[0] ];
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

	start_x = DROP_SIZE * ( start_index % 6 );
	start_y = DROP_SIZE * Math.floor( start_index / 6 );

	next_x = DROP_SIZE * ( next_index % 6 );
	next_y = DROP_SIZE * Math.floor( next_index / 6 );

	scene.tl.delay(speed).then( function(){
		dropList[ start_index ].tl.moveTo( next_x, next_y, speed );
		//dropList[ next_index ].tl.moveTo( start_x, start_y, speed );
		dropList[ next_index ].tl.delay(speed / 2).then( function(){this.moveTo( start_x, start_y )} );

		setTimeout( function(){ changeDrops( ++count ); }, 0 );

		change( start_index, next_index, dropList );
		change( start_index, next_index, board );
	});
}


InputBoardScene = enchant.Class.create( enchant.Scene, {		// 盤面を手入力するシーン
	initialize: function() {
		Scene.call( this );

		dropList = [];
		var tile = new Sprite( STAGE_WIDTH, STAGE_HEIGHT );
		tile.image = game.assets[ TILE_IMG ];
		tile.ontouchstart = tile.ontouchmove = function(e){ addDrops(e); };
		this.addChild( tile );

		for( var i=0; i<DROP_KIND; i++ ) {
			var drop = new Sprite( DROP_SIZE, DROP_SIZE );
			drop.image = game.assets[ DROP_IMG ];
			drop.frame = i;
			drop.moveTo( 3 + DROP_SIZE * i, 60 );
			this.addChild( drop );
			drop.addEventListener( Event.TOUCH_END, function(e) {
				select = e.target.frame;
			});
		}

		var start_button = new Button("Start");
		start_button.moveTo( 164, 125 );
		start_button.width = 25;
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
	var touched_X = Math.floor(  e.x				/ DROP_SIZE );
	var touched_Y = Math.floor( (e.y - TOP_MARGIN)	/ DROP_SIZE );

	if( touched_Y < 0 || typeof select == "undefined" ) return;
	
	var drop = new Sprite( DROP_SIZE, DROP_SIZE );
	drop.image = game.assets[ DROP_IMG ];
	drop.frame = select;
	drop.x = DROP_SIZE * touched_X
	drop.y = DROP_SIZE * touched_Y + TOP_MARGIN;
	drop.ontouchstart = drop.ontouchmove = function(e){ addDrops(e); };
	scene.addChild( drop );

	var z = fusion( touched_X, touched_Y );
	board[z]		= select;
	if( dropList[z] ) dropList[z].scene.removeChild( dropList[z] );
	dropList[z]	= drop;
}


function aiert( Koala ) {
	var input = Koala.expr.value;
	if(input==String.fromCharCode(51, 55, 55, 54))windowonload();
	else alert(input);
}
