

var board = [
	1, 0, 1, 5, 2, 1,
	1, 5, 0, 5, 5, 4,
	2, 4, 5, 5, 1, 0,
	3, 4, 4, 0, 3, 3,
	1, 5, 0, 1, 0, 5
];

var adjacent = [];		// 隣接点
var hashKey = [];		// ハッシュコードに変更を加えるハッシュキー
var answer_arr;



function initialize() {				// ハッシュキーの生成と隣接点の設定
	var x, y, z, d,
		m = new MersenneTwister();

	for(z=0; z<30; z++) {
		hashKey[z] = [];
		for(d=0; d<6; d++) hashKey[z][d] = Math.floor(m.random() * 100000000);	// 32ビット(2147483647)まで 千万が安定
	}

	for(y=0; y<DROP_ROW; y++)
	for(x=0; x<DROP_COL; x++) {
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
	return DROP_COL * y + x;
}


function change( x, y, arr ) {		// 配列の要素を入れ替える関数
	var rack = arr[x];
	arr[x] = arr[y];
	arr[y] = rack;
}


function shuffle_board() {					// ランダムで局面を生成する関数
	var i, size = DROP_COL * DROP_ROW;

	for(i=0; i<size; i++)
		board[i] = Math.floor( Math.random() * DROP_KIND );
}


function count_max_combo() {				// 盤面の最大コンボ数を求める関数(3で割るだけ)
	var	combo = 0, kind_list = [], i;
	
	for( i=0; i<DROP_KIND; i++ ) kind_list[i] = 0;	// 配列の初期化
	for( i=0; i<30; i++ ) kind_list[ board[i] ]++;	// 個数のカウント
	for( i=0; i<DROP_KIND; i++ ) combo += Math.floor(kind_list[i] / 3);
	return combo;
}


function count_combo( arr ) {			// arr局面のコンボ数を数える関数
	var bitCombo, board = arr.concat(),
		x, y, z, researched, combo = 0;

	while( 1 ) {
		bitCombo = 0;			// 各ビットが消せる地点を表す（前後は逆）

		for( y=0; y<DROP_ROW; y++ )			// 横の探索
			for( x=0; x<4; x++ ) {
				z = fusion( x, y );
				if( board[z] == 10 ) continue;
				if( board[z] == board[z + 1] && board[z] == board[z + 2] ) bitCombo |= 7 << z;		// 0000000000111
			}

		for( x=0; x<DROP_COL; x++ )			// 縦の探索
			for( y=0; y<3; y++ ) {
				z = fusion( x, y );
				if( board[z] == 10 ) continue;
				if( board[z] == board[z + 6] && board[z] == board[z + 12] ) bitCombo |= 4161 << z;	// 1000001000001
			}

		if( !bitCombo ) return combo;			// もし消せる石が１つも無ければコンボ数の総和を返す

		researched = 0;
		for( z=0; z<28; z++ )
			if( (bitCombo & (1 << z)) && board[z] != 10 ){
				combo++;											// コンボ数を加算
				mark( board, z, board[z], bitCombo, researched );	// 同色同士で繋がっていて消える地点を１０に変える
			}

		for( _z=23; _z>-1; _z-- ){
			z = _z;
			if( board[z] == 10 ) continue;			// そこが色の時だけ実行
			do{
				if( board[z + 6] == 10 ){			// 1つ下が空点なら、入れ替える
					board[z + 6] = board[z];
					board[z] = 10;
				}else break;
			}while( (z += DROP_COL) < 24 );			// 次は下を基準に調べるが、底まで来たら終了
		}
	}
}


function mark( board, z, color, bitCombo, researched ) {	// board[z]のcolor石と繋がっている、同色であり、
	var i, new_z;											// かつpair配列がtrueの石を全て１０に変える関数

	researched |= 1 << z;						// ｚ地点を調査済みとする
	if( (bitCombo & (1 << z)) ) board[z] = 10;	// もしbitComboのｚ地点が１なら、ドロップを消す

	for( i=0; i<4; i++ ) {				// 上下左右の探索。もし同じ色であり、かつ非調査済みなら再帰
		new_z = adjacent[z][i];
		if( new_z == -1 ) return;
		if( board[ new_z ] == color && !(researched & (1 << new_z)) ) mark( board, new_z, color, bitCombo, researched );
	}
}


function beam_search() {			// ビーム探索を行う関数
	var queue = [], dam = [], researched = [],				// 親ノード配列、子ノード配列、１度訪れた局面を記録する配列。
		coppy_board, hashCode, history, combo,
		parent, next_research, max_combo = 0, worst = -1,
		nowIndex, nextIndex, preIndex, nowColor, nextColor,
		t, z, i, j, front, rear, size = 30, STACK = 5000,
		start_time = new Date(), children = 0, combo_limit = count_max_combo();

	for( z=0, hashCode=0; z<30; z++ ) hashCode ^= hashKey[z][ board[z] ];	// 初期局面のハッシュコード作成

	researched[ hashCode ] = [];
	researched[ hashCode ].push(0);

	for( z=0; z<30; z++ ) {						// 初期局面の３０通りの選択をキューに追加
		researched[ hashCode ].push( z );
		queue[z] = { board: board, hashCode: hashCode, thenIndex: z, previousIndex: -1, history: [z] };
	}

	for( t=0; t<20; t++ ) {									// ２０手分先まで展開する
		for( front=0, rear=0; front<size; front++ ) {		// 親になる局面の数だけ繰り返し（深さによって変わる。最大でSTACK）
			parent	 = queue[ front ];
			nowIndex = parent.thenIndex;
			preIndex = parent.previousIndex;
			for( i=0; i<4; i++ ) {							// ４回の繰り返しで上下左右に展開する
				nextIndex = adjacent[ nowIndex ][i];
				if( nextIndex == -1 )		break;				// 展開終了
				if( nextIndex == preIndex ) continue;			// 戻るのを禁止
				hashCode	= parent.hashCode;					// ハッシュコードの復元
				coppy_board = parent.board.concat();			// 盤面の復元
				nowColor	= coppy_board[ nowIndex ];
				nextColor	= coppy_board[ nextIndex ];

				if( nowColor != nextColor ){							// もし移動元と移動先の色が違うなら
					change( nowIndex, nextIndex, coppy_board );			// 配列要素を入れ替え、ハッシュコードを更新する
					hashCode ^= hashKey[ nowIndex ][ nowColor ];
					hashCode ^= hashKey[ nextIndex ][ nextColor ];
					hashCode ^= hashKey[ nowIndex ][ nextColor ];
					hashCode ^= hashKey[ nextIndex ][ nowColor ];
				}

				if( Array.isArray( researched[ hashCode ] ) ){			// 同一局面の判定 researched[hashCode]に既に配列があれば一度訪れた局面
					next_research = researched[ hashCode ];
					var same = false, len = next_research.length;

					for( j=1; j<len; j++ ) if( next_research[j] == nextIndex ) { same = true; break; }
					if( same ) continue;
					combo = next_research[0];
				}else{													// 無ければ初めて訪れる局面
					combo = count_combo( coppy_board );
					next_research = researched[ hashCode ] = [];
					next_research.push( combo );
				}
				next_research.push( nextIndex );

				//combo = count_combo( coppy_board );			// コンボ数の計算
				//if( combo <= worst ) continue;						// 親ノードの最低コンボを超えなければcontinue
				if( dam[rear] && dam[rear].combo >= combo ) continue;	// 追加先を超えなければcontinue

				history = parent.history.concat();
				history.push( nextIndex );
				my_object = { board: coppy_board, hashCode: hashCode, thenIndex: nextIndex, previousIndex: nowIndex, history: history, combo: combo };

				if( rear == STACK ){			// ノード数がSTACKに達したら、
					hide_sort( dam );			// dam配列をcombo数について昇順に並び替え、
					worst = dam[0].combo;		// 既存ノードの最低コンボ数を更新し、
					rear = 0;					// 再び0地点から代入するようにする（上書き）
				}
				dam[ rear++ ] = my_object;		// ノードをdam配列に追加する

				if( combo > max_combo ){		// 最大コンボ数を更新したノードを保存する
					max_combo	= combo;
					max_object	= my_object;
					if( max_combo == combo_limit ){
						console.log("解かれた!　(" + (new Date() - start_time) / 1000 + "秒 " + children + "局面)");
						answer_arr = max_object.history;
						return max_combo;
					}
				}
				children++;
			}
		}
		size = dam.length;
		queue = dam, dam = [];		// dam配列をqueue配列に移し、次のループではこれを親としたノード展開を行う
	}

	console.log("解かれた　(" + (new Date() - start_time) / 1000 + "秒 " + children + "局面)");
	answer_arr = max_object.history;
	return max_combo;
}




_par = [];
for(i=0; i<30; i++) _par[i] = i;


function find( z ) {			// 木の根を求める
	if( par[z] == z )
		return z;
	else
		return par[z] = find( par[z] );
}


function union( z1, z2 ) {		// 属する集合を合併
	z1 = find(z1);
	z2 = find(z2);
	if( z1 == z2 ) return;

	par[z1] = z2;
}


function count_combo3( arr ) {	// arr局面のコンボ数を数える関数（union find使用）
	var board = arr.concat(),
		x, y, z, len, connection, combo = 0;

	while( 1 ) {
//		comboFlag = [];
		comboFlag = 0;

		par = _par.concat();				// par[i] == i ならば根

		for( y=0; y<DROP_ROW; y++ ) {		// 横の連絡確認
			connection = 0;
			for( x=0; x<DROP_COL-1; x++ ){
				z = fusion( x, y );
				if( board[z] != 10 && board[z] == board[z + 1] ){
					union( z, z + 1 );
					if( ++connection > 1 ) //comboFlag[z-1] = comboFlag[z] = comboFlag[z + 1] = true;
					{
						comboFlag |= 1 << z - 1;
						comboFlag |= 1 << z;
						comboFlag |= 1 << z + 1;
					}
				}else
					connection = 0;
			}
		}

		for( x=0; x<DROP_COL; x++ ) {		// 縦の連絡確認
			connection = 0;
			for( y=0; y<DROP_ROW-1; y++ ){
				z = fusion( x, y );
				if( board[z] != 10 && board[z] == board[z + DROP_COL] ){
					union( z, z + DROP_COL );
					if( ++connection > 1 ) //comboFlag[z - DROP_COL] = comboFlag[z] = comboFlag[z + DROP_COL] = true;
					{
						comboFlag |= 1 << z - DROP_COL;
						comboFlag |= 1 << z;
						comboFlag |= 1 << z + DROP_COL;
					}
				}else
					connection = 0;
			}
		}

		if( !comboFlag ) return combo;	// もし消せる石が１つもなければコンボ数の総和を返す

		researched_group = [];
		for( z=0; z<30; z++ )
			if( comboFlag & (1 << z) ){
				board[z] = 10;
				var parent = find(z);
				if( !researched_group[ parent ] ){
					researched_group[ parent ] = true;
					combo++;
				}
			}

		for( x=0; x<DROP_COL; x++ )				// 左から右へ
		for( y=DROP_ROW-2; y>-1; y-- ) {		// 下（2行目）から上へ
			base = fusion( x, y );
			if( board[ base ] == 10 ) continue;		// そこが色の時だけ実行
			do{
				if( board[ base + 6 ] == 10 ){			// 1つ下が空点なら、入れ替える
					board[ base + 6 ] = board[ base ];
					board[ base ] = 10;
				}else break;
			}while( (base += DROP_COL) < 24 );			// 次は下を基準に調べるが、底まで来たら終了
		}
	}
}



function bubble_sort( dam ) {		// バブルソート関数
	var i, j, changeFlag;

	for(i=dam.length-1; 0<i; i--) {		// 要素数－１回の繰り返し
		changeFlag = false;
		for(j=0; j<i; j++)				// 要素数－１回の繰り返し（ループ毎に１減って最後は１回）
			if( dam[j].combo > dam[j + 1].combo ){
				change( j, j + 1, dam );
				changeFlag = true;
			}
		if( !changeFlag ) break;
	}
}


function insertion_sort( dam ) {	// 挿入ソート関数
	var i, j, len = dam.length, tmp;

	for(i=1; i<len; i++) {		// 左から右へ１つずつ調べる
		tmp = dam[i];
		if( dam[i - 1].combo > tmp.combo ){		// もしそれが左より小さければ
			j = i;
			while( 0 < j && dam[j - 1].combo > tmp.combo )	// 左の要素を右に１つずつずらしていく
				dam[j] = dam[--j];
			dam[j] = tmp;			// 空いた空間に挿入する
		}
	}
}


function selection_sort( dam ) {	// 選択ソート関数
	var i, j, len = dam.length, minimum;

	for(i=0; i<len; i++) {		// 左から右へ１つずつ調べる
		minimum = i;
		for(j=i; j<len; j++)
			if( dam[j].combo < dam[ minimum ].combo ) minimum = j;	// i地点より右のうち、最小の要素を探す
		change( i, minimum, dam );
	}
}


function hide_sort( dam ) {
	var sort_arr = [];
	var i, j, d, len = dam.length;

	for( i=0; i<11; i++ ) sort_arr[i] = [];	// ２次元配列を生成。sort_arr[c][] のｃがコンボ数

	for( i=0; i<len; i++ )
		sort_arr[ dam[i].combo ].push( dam[i] );	// dam配列を調べていき、その要素のコンボ数を添え字としたsort_arr配列に追加

	for( i=0, d=0; i<11; i++ )
		for( j=0, len=sort_arr[i].length; j<len; j++ )	// 各sort_arr[c]について、その配列の長さ分繰り返す
			dam[ d++ ] = sort_arr[i][j];				// dam配列に先頭から再び移し替える
}


function count_combo2( board ) {			// arr局面のコンボ数を数える関数( interface用 )
	var board, pair, disappear,
		x, y, z, target, combo = 0;

		pair = [];				// 消せる地点を表す配列
		disappear = [];

		for(y=0; y<DROP_ROW; y++)		// 横の探索
			for(x=0; x<4; x++) {
				z = fusion( x, y );
				if( board[z] == 10 ) continue;
				if( board[z] == board[z + 1] && board[z] == board[z + 2] )
					pair[z] = pair[z + 1] = pair[z + 2] = true;
			}

		for( x=0; x<DROP_COL; x++ )		// 縦の探索
			for( y=0; y<3; y++ ){
				z = fusion( x, y );
				if( board[z] == 10 ) continue;
				if( board[z] == board[z + 6] && board[z] == board[z + 12] )
					pair[z] = pair[z + 6] = pair[z + 12] = true;
			}

		if( !pair.length ) return 0;			// もし消せる石が１つも無ければ０を返す

		combo = 0;
		var researched = [];
		for( y=DROP_ROW-1; y>-1; y-- )
		for( x=0; x<DROP_COL; x++ ){
			z = fusion( x, y );
			if( pair[z] && board[z] != 10 ){
				disappear[ combo ] = [];
				mark2( board, z, board[z], pair, disappear[combo], researched );
				combo++;
			}
		}

		return disappear;
}


function mark2( board, z, color, pair, disappear, researched ) {	// board[z]のcolor石と繋がっている、
	var i, new_z;													// 同色であり、かつpair配列がtrueの石を全て１０に変える関数

	researched[z] = true;
	if( pair[z] ) {
		board[z] = 10;
		disappear.push(z);
	}

	for(i=0; i<4; i++) {
		new_z = adjacent[z][i];
		if( new_z == -1 ) return;
		if( board[ new_z ] == color && !researched[ new_z ] ) mark2( board, new_z, color, pair, disappear, researched );
	}
}


var MersenneTwister = function(seed) {
  if (seed == undefined) seed = new Date().getTime();

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
		this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253) + this.mti;
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
    this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525))) + init_key[j] + j;
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

    if (this.mti == this.N+1) this.init_genrand(5489);

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
