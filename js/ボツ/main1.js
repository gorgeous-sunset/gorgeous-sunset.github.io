enchant();

var STAMP_IMG = "drops.png";
var TILE_IMG  = "display.png";

var STAGE_WIDTH  = 320;   // 画面横サイズ
var STAGE_HEIGHT = 480;   // 画面縦サイズ
var STAMP_SIZE   = 53;    // 画像サイズ
var STAMP_KIND   = 6;     // スタンプの種類の数
var STAMP_COL	 = 6;
var STAMP_ROW	 = 5;
var TOP_MARGIN	 = STAGE_HEIGHT - STAMP_SIZE * STAMP_ROW; 

var dragOkFlg;			//ドラッグしてOKかどうか
var dragStartFlg;		//ドラッグ開始フラグ
var dragStartPosX;		//ドラッグ開始したX
var dragStartPosY;		//ドラッグ開始したY
var dragStamp;			//ドラッグ中のスタンプ
var changeFlg;			//ドラッグでスタンプが入れ替わったかどうか

var stampList;
var board = [
	1, 0, 1, 5, 2, 1,
	1, 5, 0, 5, 5, 4,
	2, 4, 5, 5, 1, 0,
	3, 4, 4, 0, 3, 3,
	1, 5, 0, 1, 0, 5
];

var adjacent = [];		// 隣接点

var hashCode = 0;		// 盤面の状態を数値化するハッシュコード
var hashKey = [];		// ハッシュコードに変更を加えるハッシュキー
var answer_arr;


function initialize() {				// ハッシュキーの生成と隣接点の設定
	var x, y, z, d,
		m = new MersenneTwister();

	for(z=0; z<30; z++) {
		hashKey[z] = [];
		for(d=0; d<6; d++) hashKey[z][d] = Math.floor(m.random() * 1000000000);	// 32ビット(2147483647)まで
	}

	for(y=0; y<STAMP_ROW; y++)
	for(x=0; x<STAMP_COL; x++) {
		z = fusion( x, y );
			 if( x == 0 && y == 0 ) adjacent[z] = [1, 6, -1, -1];	// 左上隅
		else if( x == 5 && y == 0 ) adjacent[z] = [4, 11, -1, -1];	// 右上隅
		else if( x == 0 && y == 4 ) adjacent[z] = [18, 25, -1, -1];	// 左下隅
		else if( x == 5 && y == 4 ) adjacent[z] = [23, 28, -1, -1];	// 右下隅
		else if( y == 0 ) adjacent[z] = [z-1, z+1, z+6, -1];	// 上辺
		else if( y == 4 ) adjacent[z] = [z-1, z+1, z-6, -1];	// 下辺
		else if( x == 0 ) adjacent[z] = [z-6, z+1, z+6, -1];	// 左辺
		else if( x == 5 ) adjacent[z] = [z-6, z-1, z+6, -1];	// 右辺
		else adjacent[z] = [z-6, z-1, z+1, z+6];	// 中央
	}
}


function fusion( x, y ) {			// ｘ座標とｙ座標を１次元用に合成する関数
	return STAMP_COL * y + x;
}


function change( x, y, arr ) {		// 配列の要素を入れ替える関数
	var rack = arr[x];
	arr[x] = arr[y];
	arr[y] = rack;
}


function rand(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}


function shuffle_board() {					// ランダムで局面を生成する関数
	var i, max = STAMP_COL * STAMP_ROW;

	for(i=0; i<max; i++)
		board[i] = Math.floor( Math.random() * STAMP_KIND );
}


function count_max_combo() {				// 盤面の最大コンボ数を求める関数
	var	combo = 0, kind_list = [], i;
	
	for(i=0; i<STAMP_KIND; i++) kind_list[i] = 0;	// 配列の初期化
	for(i=0; i<30; i++) kind_list[ board[i] ]++;	// 個数のカウント
	for(i=0; i<STAMP_KIND; i++) combo += Math.floor(kind_list[i] / 3);
	return combo;
}


function count_combo( arr ) {			// arr局面のコンボ数を数える関数
	var combo = 0, count = 1,
		pair, board = arr.concat(),
		x, y, base, target;

		while( count ) {		// 消せる石がある間繰り返す
			pair = [];				// 消せる地点を表す配列

			for(y=0; y<STAMP_ROW; y++)			// 横の探索
				for(x=0; x<4; x++) {
					base = fusion( x, y );
					if( board[ base ] == 10 ) continue;
					if( board[ base ] == board[ base + 1 ] && board[ base ] == board[ base + 2 ] )
						pair[ base ] = pair[ base + 1 ] = pair[ base + 2 ] = true;
				}

			for(x=0; x<STAMP_COL; x++)			// 縦の探索
				for(y=0; y<3; y++) {
					base = fusion( x, y );
					if( board[ base ] == 10 ) continue;
					if( board[ base ] == board[ base + 6 ] && board[ base ] == board[ base + 12 ] )
						pair[ base ] = pair[ base + 6 ] = pair[ base + 12 ] = true;
				}

			if( !pair.length ) return combo;			// もし消せる石が１つも無ければコンボ数の総和を返す

			count = 0;
			for(z=0; z<30; z++)
				if( pair[z] && board[z] != 10 ){
					count++;							// コンボ数の計算
					mark( board, z, board[z], pair );	// 消える地点と繋がっている石を１０に変える
				}

			for(x=0; x<STAMP_COL; x++)				// 盤面の左から右へ
			for(y=STAMP_ROW-1; 0<y; y--) {			// 下から上へ
				base = fusion( x, y );					// 基準になる位置
				if( board[ base ] == 10 ) {				// もしそこに石がないならば
					for(i=0; i<y; i++) {						// その更に上を調べ、
						target = base - STAMP_COL * (i + 1);
						if( board[ target ] != 10 ){			// もしそこに石があるならば
							board[ base ]	= board[ target ];	// 消えた地点に移動させる
							board[ target ] = 10;
							break;
						}
					}
				}
			}
			combo += count;
		}
}


function mark( board, z, color, pair ) {		// board[z]のcolor石と繋がっている、
	var i, new_z;								// 同色であり、かつpair配列がtrueの石を全て１０に変える関数

	board[z] = 10;

	for(i=0; i<4; i++) {
		new_z = adjacent[z][i];
		if( new_z == -1 ) return;
		if( pair[ new_z ] && board[ new_z ] == color ) mark( board, new_z, color, pair );
	}
}


function search_entropy( board ) {		// 乱雑さの度合い（同色同士の距離の和）を求める関数
	var c, z, i, j, len,
		entropy = 0,
		reference_point, reference_x, reference_y,
		target_point, target_x, target_y,
		color_index = [];

	for(c=0; c<6; c++) color_index[c] = [];
	for(z=0; z<30; z++) color_index[ board[z] ].push(z);		// 色別のドロップの座標

	for(c=0; c<6; c++) {
		len = color_index[c].length;
		if( len < 3 ) continue;
		for(i=0; i<len; i++) {
			reference_point = color_index[c][i];				// 基準点
			reference_x = reference_point % STAMP_COL;
			reference_y = Math.floor( reference_point / STAMP_COL );
			for(j=0; j<len; j++) {
				target_point = color_index[c][j];				// 比較対象
				if( reference_point == target_point ) continue;
				target_x = target_point % STAMP_COL;
				target_y = Math.floor( target_point / STAMP_COL );
				entropy += Math.abs( reference_x - target_x );		// ｘ座標の差の絶対値を加算
				//entropy += Math.abs( reference_y - target_y );		// ｙ座標の差の絶対値を加算
			}
		}
	}
	return entropy;
}


function search() {			// 最短手順の探索を行う関数
	var queue = [],
		coppy_board,
		researched = [],
		z, i, j, len, same,
		nowIndex, nextIndex, preIndex,
		nowColor, nextColor, hashCode = 0,
		front = 0, rear = 30, start_time = new Date();

	for(z=0; z<30; z++) hashCode ^= hashKey[z][ board[z] ];		// 初期局面のハッシュコード作成

	researched[ hashCode ] = [];
	researched[ hashCode ].push( board );

	for(z=0; z<30; z++) {						// 初期局面の３０通りの選択をキューに追加
		researched[ hashCode ].push( z );
		queue[z] = { hashCode: hashCode, thenIndex: z, previousIndex: -1, previousQuewe: -1 };
	}

	while( 1 ) {
		nowIndex = queue[ front ].thenIndex;
		preIndex = queue[ front ].previousIndex;
		for(i=0; i<4; i++) {
			nextIndex = adjacent[ nowIndex ][i];
			if( nextIndex == -1 )		break;
			if( nextIndex == preIndex ) continue;
			hashCode	= queue[ front ].hashCode;					// ハッシュコードの復元
			coppy_board = researched[ hashCode ][0].concat();		// 盤面の復元
			nowColor	= coppy_board[ nowIndex ];
			nextColor	= coppy_board[ nextIndex ];
			if( nowColor != nextColor ){							// もし移動元と移動先の色が違うなら
				change( nowIndex, nextIndex, coppy_board );			// 配列要素を入れ替え、ハッシュコードを更新する
				hashCode ^= hashKey[ nowIndex ][ nowColor ];
				hashCode ^= hashKey[ nextIndex ][ nextColor ];
				hashCode ^= hashKey[ nowIndex ][ nextColor ];
				hashCode ^= hashKey[ nextIndex ][ nowColor ];
			}

			if( Array.isArray( researched[ hashCode ] ) ){				// 同一局面の判定
				len = researched[ hashCode ].length;
				same = false;

				for(j=1; j<len; j++) if( researched[ hashCode ][j] == nextIndex ) { same = true; break; }
				if( same ) continue;
			}else{
				researched[ hashCode ] = [];
				researched[ hashCode ].push( coppy_board );
			}

			researched[ hashCode ].push( nextIndex );
			queue[rear] = { hashCode: hashCode, thenIndex: nextIndex, previousIndex: nowIndex, previousQuewe: front };

			if( count_combo( coppy_board ) > 5 ) {
				var end_time = new Date();
				console.log("解かれた　(" + (end_time - start_time) / 1000 + "秒)");
				console.log("front:" + front + " rear:" + rear);
				answer_arr = [];
				answer( queue, rear );
				console.log( answer_arr );
				return;
			}
			rear++;
		}
		front++;
	}
	console.log("400万局面を超えたので探索を打ち切ります");
}


function answer( queue, front ) {
	if( queue[ front ].previousQuewe != -1 )
		answer( queue, queue[ front ].previousQuewe );
	answer_arr.push( queue[ front ].thenIndex );
}


window.onload = function(){
	game = new Game( STAGE_WIDTH, STAGE_HEIGHT );
	game.fps = 24;
	game.preload( STAMP_IMG, TILE_IMG );

	game.rootScene.backgroundColor = "black";
	game.onload = function(){
		initialize();
		scene = new GameStartScene();
		game.pushScene(　scene　);
	}
	game.start();
};


InputBoardScene = enchant.Class.create( enchant.Scene, {
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
		start_button.moveTo( 164, 149 );
		start_button.width = 26;
		start_button.height = 42;
		this.addChild( start_button );
		start_button.addEventListener( Event.TOUCH_END, function() {
			game.popScene();
			scene = new GameStartScene();
			game.pushScene( scene );
			console.log( "\nこの局面は" + count_combo( board ) + "コンボ　　最大" + count_max_combo() + "コンボ" );
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


GameStartScene = enchant.Class.create(enchant.Scene, {
	initialize: function() {
		var coppy_board = board.concat();

		Scene.call(this);

		dragOkFlg = true;
		dragStartFlg = changeFlg = false;

		var tile = new Sprite( STAGE_WIDTH, STAGE_HEIGHT );
		tile.image = game.assets[ TILE_IMG ];
		this.addChild( tile );

		var input_button = new Button("Input");
		input_button.moveTo( 4, 149 );
		input_button.addEventListener( Event.TOUCH_END, function() {
			game.popScene();
			scene = new InputBoardScene();
			game.pushScene( scene );
		});

		var reset_button = new Button("Reset");
		reset_button.moveTo( 57, 145 );
		reset_button.addEventListener( Event.TOUCH_END, function() {
			board = coppy_board;
			game.popScene();
			scene = new GameStartScene();
			game.pushScene( scene );
		});

		var shuffle_button = new Button("Shuffle");
		shuffle_button.moveTo( 110, 145 );
		shuffle_button.addEventListener( Event.TOUCH_END, function() {
			shuffle_board();
			game.popScene();
			scene = new GameStartScene();
			game.pushScene( scene );
			console.log( "\nこの局面は" + count_combo( board ) + "コンボ　　最大" + count_max_combo() + "コンボ" );
		});

		var solve_button = new Button("Solve");
		solve_button.moveTo( 164, 149 );
		solve_button.ontouchend = function(){ search(); };

		var move_button = new Button("Move");
		move_button.moveTo( 216, 149 );
		move_button.addEventListener( Event.TOUCH_END, function() {
			board = coppy_board;
			game.popScene();
			scene = new GameStartScene();
			game.pushScene( scene );

			stampList[ answer_arr[0] ].opacity = 0.5;
			changeDrops( 0 );
		});

		input_button.width = reset_button.width = shuffle_button.width = solve_button.width = move_button.width = 26;
		input_button.height = reset_button.height = shuffle_button.height = solve_button.height = move_button.height = 42;

		this.addChild( input_button );
		this.addChild( reset_button );
		this.addChild( move_button );
		this.addChild( shuffle_button );
		this.addChild( solve_button );

		var group = new Group();
		group.y = TOP_MARGIN;
		this.addChild( group );

		stampList = new Array();
		for(var y=0; y<STAMP_ROW; y++)
		for(var x=0; x<STAMP_COL; x++)
			createStamp(group, x, y);

/*		var startTime = new Date();
		for(var i=0; i<10000000; i++){
			count_combo2( board );
		}
		var endTime = new Date();
		console.log("1000万回の実行時間: " + (endTime - startTime) / 1000 + "秒" );	// 4.2	5.9
*/
	}
});


function changeDrops( count ) {
	var start_index, next_index,
		start_x, next_y,
		start_y, next_y;

	if( count + 1 == answer_arr.length ) {
		//setTimeout( function() {removeDrops();}, 700 );
		return;
	}

	start_index = answer_arr[ count ];
	next_index	= answer_arr[ count + 1 ];

	start_x = STAMP_SIZE * ( start_index % 6 );
	start_y = STAMP_SIZE * Math.floor( start_index / 6 );

	next_x = STAMP_SIZE * ( next_index % 6 );
	next_y = STAMP_SIZE * Math.floor( next_index / 6 );

	scene.tl.delay(15).then( function(){
		stampList[ start_index].tl.moveTo( next_x, next_y, 15 );
		stampList[ next_index ].tl.moveTo( start_x, start_y, 15 );

		setTimeout( function(){ changeDrops( ++count ); }, 0 );

		change( start_index, next_index, stampList );
		change( start_index, next_index, board );
	});
}


function createStamp( stage, x, y ) {
	var z = fusion(x, y);
	var stamp = new Sprite( STAMP_SIZE, STAMP_SIZE );
	stamp.image = game.assets[ STAMP_IMG ];
	stamp.no	=
	stamp.frame	= board[ z ];
	stamp.x		= STAMP_SIZE * x;
	stamp.y		= STAMP_SIZE * y;
	stage.addChild( stamp );
	stampList[ z ] = stamp;

	stamp.addEventListener(Event.TOUCH_START, function(e){		//指が触れた瞬間の処理
		if( dragOkFlg ){
			dragStamp			= e.target;
			dragStartFlg		= true;
			changeFlg			= false;
			dragStartPosX		= Math.floor( e.target.x / STAMP_SIZE );
			dragStartPosY		= Math.floor( e.target.y / STAMP_SIZE );
			e.target.opacity	= 0.2;
			move_count = 0;
		}
	});

	stamp.addEventListener(Event.TOUCH_MOVE, function(e){		//指が触れて動いている時の処理
		if( dragOkFlg ){
			var nowX = Math.floor(  e.x			/ STAMP_SIZE );
			var nowY = Math.floor( (e.y - 200)	/ STAMP_SIZE );

			if( dragStartPosX != nowX || dragStartPosY != nowY ){
				changeFlg		= true;
				var before_Z	= fusion( dragStartPosX, dragStartPosY );
				var after_Z		= fusion( nowX, nowY );
				var moveStamp	= stampList[ after_Z ];
				dragStamp.x		= STAMP_SIZE * nowX;
				dragStamp.y		= STAMP_SIZE * nowY;
				moveStamp.x		= STAMP_SIZE * dragStartPosX;
				moveStamp.y		= STAMP_SIZE * dragStartPosY;

				stampList[ after_Z ] = stampList[ before_Z ];
				stampList[ before_Z ] = moveStamp;
				dragStartPosX = nowX;
				dragStartPosY = nowY;
				change( before_Z, after_Z, board );
				move_count++;
			}
		}
	});

	stamp.addEventListener(Event.TOUCH_END, function(e){		//指が離れた瞬間の処理
		if( dragOkFlg ){
			dragStartFlg		= false;
			dragOkFlg			= true;
			dragStamp.opacity	= 1;
			if( !changeFlg ) dragOkFlg = true;
		}
		console.log( count_combo( board ) + "コンボ！　" + move_count + "move" );
		removeDrops();
	});
}


function removeDrops() {				// ドロップを消す関数
	var disappear, target,
		i, j, len, len2;

	disappear = count_combo2( board );
	if( !disappear ) return;
	for(i=0, len =disappear.length;		i<len;	i++)
	for(j=0, len2=disappear[i].length;	j<len2;	j++) {
		target = stampList[ disappear[i][j] ];
		target.tl.delay(15 * i).fadeOut( 17 ).delay(0).then(function(){
			this.parentNode.removeChild( this );
		});
	}
	window.setTimeout( dropDrops, 700 * len );
}


function dropDrops() {					// ドロップを落とす関数
	var x, y, i, base;

	for(x=0; x<STAMP_COL; x++)
	for(y=STAMP_ROW; 0<y; y--) {
		base = fusion( x, y );
		if( board[ base ] == 10 ) {
			for(i=0; i<y; i++) {
				target = base - STAMP_COL * (i + 1);
				if( board[ target ] != 10 ) {
					board[ base ]	= board[ target ];
					board[ target]	= 10;
					stampList[ base ] = stampList[ target ];
					stampList[ target ].tl.moveTo( STAMP_SIZE * x, STAMP_SIZE * y, 15 ).then(function(){
						removeDrops();
					});
					break;
				}
			}
		}
	}
}


function count_combo2( board ) {			// arr局面のコンボ数を数える関数
	var combo = 0, count = 0,
		board, pair, disappear,		// 盤面の状態、消せる石
		x, y, base, target;

		pair = [];				// 消せる地点を表す配列
		disappear = [];

		for(y=0; y<STAMP_ROW; y++) {		// 横の探索
			for(x=0; x<4; x++) {
				base = fusion( x, y );
				if( board[ base ] == 10 ) continue;
				if( board[ base ] == board[ base + 1 ] && board[ base ] == board[ base + 2 ] )
					pair[ base ] = pair[ base + 1 ] = pair[ base + 2 ] = true;
			}
		}

		for(x=0; x<STAMP_COL; x++) {		// 縦の探索
			for(y=0; y<3; y++) {
				base = fusion( x, y );
				if( board[ base ] == 10 ) continue;
				if( board[ base ] == board[ base + 6 ] && board[ base ] == board[ base + 12 ] )
					pair[ base ] = pair[ base + 6 ] = pair[ base + 12 ] = true;
			}
		}
		if( !pair.length ) return 0;			// もし消せる石が１つも無ければ０を返す

		count = 0;
		for(z=0; z<30; z++) {
			if( pair[z] && board[z] != 10 ){
				disappear[ count ] = [];
				mark2( board, z, board[z], pair, disappear[count] );
				count++;
			}
		}

		return disappear;
}


function mark2( board, z, color, pair, disappear ) {		// board[z]のcolor石と繋がっている、
	var i, new_z;											// 同色であり、かつpair配列がtrueの石を全て１０に変える関数

	board[z] = 10;
	disappear.push(z);

	for(i=0; i<4; i++) {
		new_z = adjacent[z][i];
		if( new_z == -1 ) return;
		if( pair[ new_z ] && board[ new_z ] == color ) mark2( board, new_z, color, pair, disappear );
	}
}




var MersenneTwister = function(seed) {
  if (seed == undefined)
    seed = new Date().getTime();

  this.N = 624;
  this.M = 397;
  this.MATRIX_A = 0x9908b0df;
  this.UPPER_MASK = 0x80000000;
  this.LOWER_MASK = 0x7fffffff;
 
  this.mt = new Array(this.N);
  this.mti=this.N+1;

  this.init_genrand(seed);
};


MersenneTwister.prototype.init_genrand = function(s) {
  this.mt[0] = s >>> 0;
  for (this.mti=1; this.mti<this.N; this.mti++) {
      var s = this.mt[this.mti-1] ^ (this.mt[this.mti-1] >>> 30);
   this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253)
  + this.mti;
      this.mt[this.mti] >>>= 0;
  }
}
 

MersenneTwister.prototype.init_by_array = function(init_key, key_length) {
  var i, j, k;
  this.init_genrand(19650218);
  i=1; j=0;
  k = (this.N>key_length ? this.N : key_length);
  for (; k; k--) {
    var s = this.mt[i-1] ^ (this.mt[i-1] >>> 30)
    this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525)))
      + init_key[j] + j;
    this.mt[i] >>>= 0;
    i++; j++;
    if (i>=this.N) { this.mt[0] = this.mt[this.N-1]; i=1; }
    if (j>=key_length) j=0;
  }
  for (k=this.N-1; k; k--) {
    var s = this.mt[i-1] ^ (this.mt[i-1] >>> 30);
    this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1566083941) << 16) + (s & 0x0000ffff) * 1566083941)) - i;
    this.mt[i] >>>= 0;
    i++;
    if (i>=this.N) { this.mt[0] = this.mt[this.N-1]; i=1; }
  }

  this.mt[0] = 0x80000000; 
}
 

MersenneTwister.prototype.genrand_int32 = function() {
  var y;
  var mag01 = new Array(0x0, this.MATRIX_A);

  if (this.mti >= this.N) {
    var kk;

    if (this.mti == this.N+1)
      this.init_genrand(5489);

    for (kk=0;kk<this.N-this.M;kk++) {
      y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk+1]&this.LOWER_MASK);
      this.mt[kk] = this.mt[kk+this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
    }
    for (;kk<this.N-1;kk++) {
      y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk+1]&this.LOWER_MASK);
      this.mt[kk] = this.mt[kk+(this.M-this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
    }
    y = (this.mt[this.N-1]&this.UPPER_MASK)|(this.mt[0]&this.LOWER_MASK);
    this.mt[this.N-1] = this.mt[this.M-1] ^ (y >>> 1) ^ mag01[y & 0x1];

    this.mti = 0;
  }

  y = this.mt[this.mti++];

  y ^= (y >>> 11);
  y ^= (y << 7) & 0x9d2c5680;
  y ^= (y << 15) & 0xefc60000;
  y ^= (y >>> 18);

  return y >>> 0;
}
 

MersenneTwister.prototype.genrand_int31 = function() {
  return (this.genrand_int32()>>>1);
}
 

MersenneTwister.prototype.genrand_real1 = function() {
  return this.genrand_int32()*(1.0/4294967295.0); 
}


MersenneTwister.prototype.random = function() {
  return this.genrand_int32()*(1.0/4294967296.0); 
}
 

MersenneTwister.prototype.genrand_real3 = function() {
  return (this.genrand_int32() + 0.5)*(1.0/4294967296.0); 
}
 

MersenneTwister.prototype.genrand_res53 = function() { 
  var a=this.genrand_int32()>>>5, b=this.genrand_int32()>>>6; 
  return(a*67108864.0+b)*(1.0/9007199254740992.0); 
} 






function checkStamp(){						//コンボ判定
	for(var y = 0; y < STAMP_ROW; y++){
		for(var x = 0; x < STAMP_COL; x++){
			var count = 1;		//いくつ連続でつながっているか
			var flg = true;		//whileループ用のフラグ
			var nowCheckBaseStamp = getStamp(x,y);	//チェック中スタンプ
			//右のチェック
			while(flg){
				//画面範囲内の場合チェック
				if(x + count < STAMP_COL){
					var nowCheckTargetStamp = getStamp(x + count,y);	//比較対象スタンプ
					//一致の場合さらに右もチェック
					if(nowCheckBaseStamp.no === nowCheckTargetStamp.no){
						count++;
					}else{
						flg = false;
						//二個以上つながっていたらコンボに追加
						if(count >2){
							addCombo(x,y,count,true);
						}
						count = 1;
					}
				}else{
					flg = false;
					if(count >2){
						addCombo(x,y,count,true);
					}
					count = 1;
				}
			}
			//下のチェック
			flg = true;
			while(flg){
				//画面範囲内の場合チェック
				if(y + count < STAMP_ROW){
					var nowCheckTargetStamp = stampList[x + ((y + count)* STAMP_COL)];	//比較対象スタンプ
					//一致の場合さらに右もチェック
					if(nowCheckBaseStamp.no === nowCheckTargetStamp.no){
						count++;
					}else{
						flg = false;
						//二個以上つながっていたらコンボに追加
						if(count >2){
							addCombo(x,y,count,false);
						}
						count = 1;
					}
				}else{
					flg = false;
					if(count >2){
						addCombo(x,y,count,false);
					}
					count = 1;
				}
			}
		}
	}
	
	// コンボ判定終了
	console.log("コンボ数は " + comboCount);
}


function addCombo(x,y,count,colFlg){	//コンボに追加 count つながってた数 colFlg よこかたてか
	comboCount++;
	var nowX = x;
	var nowY = y;
	var targetComboCount = comboCount;		//追加するコンボ番号
	
	for(var i = 0; i < count; i++){			//コンボに追加
		if(i !== 0){
			if(colFlg)	nowX ++;
			else		nowY ++;
		}
		var nowStamp = stampList[nowX + nowY * STAMP_COL];

		//コンボに追加
		nowStamp.comboNo = targetComboCount;
		nowStamp.opacity = 0.5;
	}
	
}

