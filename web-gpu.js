async function init() {
    // WebGPUをサポートしているか確認
    if (!navigator.gpu) {
        throw Error("WebGPUをサポートしているデバイスがありません");
    }

    // アダプターの取得
    const adapter = await navigator.gpu.requestAdapter();
    if(!adapter) {
        throw Error("アダプターの取得に失敗しました");
    }
    
    // アダプターの情報
    const adapterInfo = await adapter.requestAdapterInfo();
    console.log(adapterInfo.architecture);  // 属するGPUのファミリまたはクラスの名前
    console.log(adapter.description);       // 人間が判読できる説明（文字列）
    console.log(adapter.device);            // ベンダー固有の識別子
    console.log(adapterInfo.vendor);        // ベンダーの名前
    
    // デバイスの取得
    const device = await adapter.requestDevice();
    
    // canvas要素の取得とwebgpuコンテキストの取得
    const canvas = document.querySelector("#gpuCanvas");
    const context = canvas.getContext("webgpu");

    context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "premultiplied",
    });

    const shaders = `
    struct VertexOut {
        @builtin(position) position : vec4f,
        @location(0) color : vec4f
    }

    @vertex
    fn vertex_main(
        @location(0) position: vec4f,
        @location(1) color: vec4f
    ) -> VertexOut
    {
        var output : VertexOut;
        output.position = position;
        output.color = color;
        
        return output;
    }

    @fragment
    fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
    {
        return fragData.color;
    }
    `;

    const shaderModule = device.createShaderModule({
        code: shaders,
    });

    // WebGPUプログラムで使用できる形式でデータを定義している    
    const vertices = new Float32Array([
        0.0, 0.6, 0, 1, 1, 0, 0, 1, -0.5, -0.6, 0, 1, 0, 1, 0, 1, 0.5, -0.6, 0, 1, 0,
        0, 1, 1,
    ]);
    
    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);


    // 頂点データの必要なレイアウトを記述するオブジェクト
    // 配列シェーダーと頂点シェーダーを説明している
    // 各頂点には位置と色のデータがある
    const vertexBuffers = [
        {
            attributes: [
                {
                    shaderLocation: 0, // position
                    offset: 0,
                    format: "float32x4",
                },
                {
                    shaderLocation: 1, // color
                    offset: 16,
                    format: "float32x4",
                },
            ],
            arrayStride: 32,
            stepMode: "vertex",
        },
    ];

    // レンダーパイプラインステージの設定を指定する記述子オブジェクトを作成
    const pipelineDescriptor = {
        vertex: {
            module: shaderModule,
            entryPoint: "vertex_main",
            buffers: vertexBuffers,
        },
        fragment: {
            module: shaderModule,
            entryPoint: "fragment_main",
            targets: [
                {
                    format: navigator.gpu.getPreferredCanvasFormat(),
                },
            ],
        },
        primitive: {
            topology: "triangle-list",
        },
        layout: "auto",
    }

    const renderPipeline = device.createRenderPipeline(pipelineDescriptor);

    const commandEncoder = device.createCommandEncoder();

    const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

    const renderPassDescriptor = {
        colorAttachments: [
            {
                clearValue: clearColor,
                loadOp: "clear",
                storeOp: "store",
                view: context.getCurrentTexture().createView(),
            },
        ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(3);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}

function main() {
    console.log("hello world"); 
    init();
}

main();