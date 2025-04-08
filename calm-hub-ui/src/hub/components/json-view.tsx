import { useNavigate } from 'react-router-dom';
import { allExpanded, defaultStyles, JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { Data } from '../../model/calm.js';
import { runGenerate } from '../../../../shared/src/commands/generate/generate.js'
interface JsonRendererProps {
    jsonString: Data | undefined;
}


export function JsonRenderer({ jsonString }: JsonRendererProps) {
    const dataType  = jsonString?.dataType;
    
    const defaultMessage = <div className=" text-center">Please select a document to load.</div>;
    const navigate = useNavigate();
    const jsonView = (
        <div>
            <button
                className="bg-primary hover:bg-blue-500 text-white font-bold py-2 px-4 rounded float-right"
                onClick={handleClick}
            >
                Visualize
            </button>
            <JsonView
                data={jsonString || ''}
                shouldExpandNode={allExpanded}
                style={defaultStyles}
            />
        </div>
    );
    async function handleClick() {
        const pattern: Data = {
            name: '',
            data: undefined,
            dataType: ''
        };
        if(dataType !== 'Flow' && dataType !== 'Pattern'){
            console.log(jsonString)
            navigate('/visualizer', { state: jsonString });
        }
        else{
           console.log(jsonString?.data)
           const data = jsonString?.data
           if(data){
            let parsed;
            if (typeof data === 'string') {
                parsed = JSON.parse(data);
              } else {
                parsed = data; // Already an object
              }
            const patternArc =  await runGenerate(parsed);
            pattern.data = patternArc;
            pattern.name = jsonString.name
            pattern.dataType = jsonString.dataType
            console.log(jsonString)
            navigate('/visualizer', {state: pattern})
           }
        }
    }

    const content = jsonString ? jsonView : defaultMessage;

    return <div className="p-5 flex-1 overflow-auto bg-[#eee]">{content}</div>;
}
